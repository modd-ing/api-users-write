'use strict';

const Promise = require( 'bluebird' );
const r = require( 'rethinkdbdash' )({
  host: 'rethinkdb-proxy',
  db: 'modding'
});

require( 'rethinkdb-init' )( r );

exports.r = r;
