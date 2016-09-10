'use strict';

const Promise = require( 'bluebird' );

Promise.config({
  cancellation: true
});

const bcrypt = require( 'bcryptjs' );
const db = require( '../db' );
const r = db.r;
const _ = require( 'lodash' );

module.exports = function () {

  // Promisify the seneca .act() method
  const act = Promise.promisify( this.act, { context: this });

  this.add( 'role:api,path:users,cmd:post', function( msg, done ) {

    if ( ! msg.body ) {

      done( null, {
        errors: [
          {
            title: 'Parameters not valid',
            detail: 'JSON body is missing.',
            propertyName: 'body',
            status: 400
          }
        ]
      });

      return;

    }

    const email = msg.body.email,
      password = msg.body.password,
      username = msg.body.username;

    const promise = Promise
      .each([
        act({
          role: 'api',
          path: 'users',
          cmd: 'validateUsername',
          username: username
        }),
        act({
          role: 'api',
          path: 'users',
          cmd: 'validateEmail',
          email: email
        }),
        act({
          role: 'api',
          path: 'users',
          cmd: 'validatePassword',
          password: password
        })
      ], ( reply ) => {

        if ( ! _.isEmpty( reply.errors ) ) {

          promise.cancel();

          done( null, reply );

        }

      })
      .then( () => {

        return hashPassword( password );

      })
      .then( ( hashedPassword ) => {

        // Looks like username, email and password are all valid, let's create the user!
        const user = {
            username: username,
            password: hashedPassword,
            email: email,
            role: 'basic'
          };

        return r
          .table( 'User' )
          .insert( user, { returnChanges: true } )
          .run()
          .then( ( result ) => {

            if ( 0 === result.inserted ) {

              done( null, {
                errors: [
                  {
                    title: 'Unknown error',
                    detail: 'Failed writing to database.',
                    status: 500
                  }
                ]
              });

              return;

            }

            const data = result.changes[0].new_val;

            delete data.password;

            done( null, {
              data: data
            });

          })
          .catch( ( err ) => {

            done( err, null );

          });

      })
      .catch( ( err ) => {

        done( err, null );

      });

  });

  return {
    name: 'api-users-write'
  };

};

function hashPassword( password ) {

  return new Promise( ( resolve, reject ) => {

    bcrypt.genSalt( 11, ( err, salt ) => {

      if ( err ) {

        reject( err );

        return;

      }

      bcrypt.hash( password, salt, ( err, hash ) => {

        if ( err ) {

          reject( err );

          return;

        }

        resolve( hash );

      });

    });

  });

}
