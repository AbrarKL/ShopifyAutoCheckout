var jar = require('request').jar();
var request = require('request').defaults({ jar: jar });
var cheerio = require('cheerio');
var fs = require('fs');
var config = JSON.parse(fs.readFileSync('profile.json'));

var userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/57.0.2987.133 Safari/537.36';

var auth_token, new_auth_token, price, storeID, url, checkoutHost, checkoutID, payment_gateway;

//This request gets the Contact Information
request.get({
		headers: {
			'user-agent': userAgent
		},
		url: config.website.url + '/cart/' + config.website.itemid + ':' + config.website.quantity
	},
	function (error, response, body) {
		$ = cheerio.load(body);
		auth_token = $('form.edit_checkout input[name=authenticity_token]').attr('value');
		url = response.request.href;
		checkoutHost = response.request.originalHost;
		storeID = $('form.edit_checkout').attr('action').split('/')[1];
		checkoutID = $('form.edit_checkout').attr('action').split('/')[3];
		console.log("Authenticity Token: " + auth_token);
		console.log("Checkout URl: " + url);
		console.log("Checkout Host: " + checkoutHost);
		console.log("Store ID: " + storeID)
		console.log("Checkout ID: " + checkoutID);
		//This request is for the contact_information page
		request({
			url: url,
			followAllRedirects: true,
			method: 'post',
			headers: {
				Origin: response.request.originalHost,
				'Content-Type': 'application/x-www-form-urlencoded',
				Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
				'Accept-Language': 'en-US,en;q=0.8',
				Referer: checkoutHost + '/' + storeID + '/checkouts/' + checkoutID,
				'User-Agent': userAgent,
			},
			formData: {
				utf8: '✓',
				_method: 'patch',
				authenticity_token: $('form.edit_checkout input[name=authenticity_token]').attr('value'),
				previous_step: 'contact_information',
				'checkout[email]': config.billing.email,
				'checkout[shipping_address][first_name]': config.billing.firstName,
				'checkout[shipping_address][last_name]': config.billing.lastName,
				'checkout[shipping_address][company]': '',
				'checkout[shipping_address][address1]': config.billing.addressLine1,
				'checkout[shipping_address][address2]': config.billing.addressLine2,
				'checkout[shipping_address][city]': config.billing.city,
				'checkout[shipping_address][country]': config.billing.country,
				'checkout[shipping_address][province]': config.billing.province,
				'checkout[shipping_address][zip]': config.billing.zipCode,
				'checkout[shipping_address][phone]': config.billing.phoneNumber,
				'checkout[remember_me]': '0',
				'checkout[client_details][browser_width]': '979',
				'checkout[client_details][browser_height]': '631',
				'checkout[client_details][javascript_enabled]': '1',
				step: 'contact_information',
			},
		}, function (error, response, body) {
			//This request is for the shipping_information page
			request({
				url: url,
				followAllRedirects: true,
				method: 'post',
				headers: {
					Origin: checkoutHost,
					'Content-Type': 'application/x-www-form-urlencoded',
					Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
					'Accept-Language': 'en-US,en;q=0.8',
					Referer: checkoutHost + '/' + storeID + '/checkouts/' + checkoutID,
					'User-Agent': userAgent,
				},
				formData: {
					utf8: '✓',
					_method: 'patch',
					authenticity_token: auth_token,
					previous_step: 'contact_information',
					step: 'shipping_method',
					'checkout[email]': config.billing.email,
					'checkout[buyer_accepts_marketing]': '1',
					'checkout[shipping_address][first_name]': config.billing.firstName,
					'checkout[shipping_address][last_name]': config.billing.lastName,
					'checkout[shipping_address][company]': '',
					'checkout[shipping_address][address1]': config.billing.addressLine1,
					'checkout[shipping_address][address2]': config.billing.addressLine2,
					'checkout[shipping_address][city]': config.billing.city,
					'checkout[shipping_address][country]': config.billing.country,
					'checkout[shipping_address][province]': config.billing.province,
					'checkout[shipping_address][zip]': config.billing.zipCode,
					'checkout[shipping_address][phone]': config.billing.phoneNumber,
					'checkout[remember_me]': '0',
					button: '',
					'checkout[client_details][browser_width]': '979',
					'checkout[client_details][browser_height]': '631',
				},
			}, function (error, response, body) {
				$ = cheerio.load(body);
				//This request is for the payment_method page
				request({
					url: url,
					followAllRedirects: true,
					method: 'post',
					headers: {
						'User-Agent': userAgent,
						'Content-Type': 'application/x-www-form-urlencoded',
					},
					formData: {
						utf8: '✓',
						_method: 'patch',
						authenticity_token: auth_token,
						button: '',
						previous_step: 'shipping_method',
						step: 'payment_method',
						'checkout[shipping_rate][id]': $('div.content-box__row .radio-wrapper').attr('data-shipping-method'),
					},
				}, function (error, response, body) {
					$ = cheerio.load(body);
					price = $('input[name="checkout[total_price]"]').attr('value');
					payment_gateway = $('input[name="checkout[payment_gateway]"]').attr('value');
					new_auth_token = $('form[data-payment-form=""] input[name="authenticity_token"]').attr('value');

					console.log("Price: " + price);
					console.log("Payment Gateway: " + payment_gateway);
					console.log("New Authenticity Token: " + new_auth_token);
					//This request is for submitting your card details page
					request({
						url: 'https://elb.deposit.shopifycs.com/sessions',
						followAllRedirects: true,
						method: 'post',
						headers: {
							'User-Agent': userAgent,
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							credit_card: {
								number: config.card.cardNumber,
								verification_value: config.card.ccv, //ccv
								name: config.card.cardHolderName,
								month: parseInt(config.card.expiryMonth), // Expiry month
								year: parseInt(config.card.expiryYear), //Expiry Year
							},
						}),
					}, function (error, response, body) {
						//This request is for finalizing payment
						request({
							url: url,
							followAllRedirects: true,
							method: 'post',
							headers: {
								Origin: checkoutHost,
								'Content-Type': 'application/x-www-form-urlencoded',
								Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
								'Accept-Language': 'en-US,en;q=0.8',
								Referer: checkoutHost + '/' + storeID + '/checkouts/' + checkoutID,
								'User-Agent': userAgent,
							},
							formData: {
								utf8: '✓',
								_method: 'patch',
								authenticity_token: new_auth_token,
								previous_step: 'payment_method',
								step: '',
								s: JSON.parse(body).id,
								'checkout[payment_gateway]': payment_gateway,
								'checkout[credit_card][vault]': 'false',
								'checkout[different_billing_address]': 'false',
								'checkout[billing_address][first_name]': "XXX",
								'checkout[billing_address][last_name]': "XXX",
								'checkout[billing_address][company]': '',
								'checkout[billing_address][address1]': "XXX Road",
								'checkout[billing_address][address2]': '',
								'checkout[billing_address][city]': 'XXX',
								'checkout[billing_address][country]': 'United States',
								'checkout[billing_address][province]': 'Arizona',
								'checkout[billing_address][zip]': '85001',
								'checkout[billing_address][phone]': '07129151286',
								'checkout[total_price]': price,
								complete: '1',
								'checkout[client_details][browser_width]': '979',
								'checkout[client_details][browser_height]': '631',
								'checkout[client_details][javascript_enabled]': '1',
							},
						}, function (error, response, body) {
							var $ = cheerio.load(body);
							console.log("Step: " + $('input[name="step"]').val());
							if ($('div.notice--warning p.notice__text') == '') {
								console.log("An unknown error has occured");
								console.log(response.request.href);
							} else {
								console.log("Error: " + $('div.notice--warning p.notice__text'));
							}
						});
					});
				});
			});
		});
	});