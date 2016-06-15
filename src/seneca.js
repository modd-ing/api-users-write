'use strict';

const seneca = require( 'seneca' )();

seneca
	.use( 'seneca-amqp-transport' )
	.use( './seneca-plugins/api-users-write' )
	.use( './seneca-plugins/api-users-validate' );

seneca.ready( function( err ) {

	if ( err ) {

		process.exit( 1 );

		return;

	}

	seneca
		.listen({
			pin: 'role:api,path:users,type:write',
			type: 'amqp',
			url: 'amqp://rabbitmq-api'
		})
		.client({
			pin: 'role:api,path:users,type:read',
			type: 'amqp',
			url: 'amqp://rabbitmq-api'
		});

});

module.exports = function() {

	return seneca;

};
