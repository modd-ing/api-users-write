'use strict';

const Promise = require( 'bluebird' );
const r = require( 'rethinkdbdash' )({
	host: 'rethinkdb-proxy',
	db: 'modding'
});

require( 'rethinkdb-init' )( r );

exports.init = function() {

	return new Promise( ( resolve, reject ) => {

		r.init({
				host: 'rethinkdb-proxy',
				db: 'modding'
			}, [
				{
					name    : 'User',
					replicas: 3,
					shards  : 3,
					indexes : [
						{
							name         : 'lowercase_username',
							indexFunction: ( row ) => {

								return row( 'username' ).downcase();

							}
						},
						'email',
						'timestamp'
					]
				}
			])
			.then( resolve )
			.catch( reject );

	});

}

exports.r = r;
