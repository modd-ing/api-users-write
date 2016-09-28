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
            emailConfirmed: false,
            role: 'basic',
            signature: '',
            timestamp: r.now(),
            color: '#ff5040'
          };

        return r
          .table( 'User' )
          .insert( user, { returnChanges: true } )
          .run();

      })
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

  });

  this.add( 'role:api,path:users,cmd:patch', function( msg, done ) {

    if ( ! msg.params || ! msg.params.id ) {

      done( null, {
        errors: [
          {
            title: 'Parameters not valid',
            detail: 'User id is missing.',
            propertyName: 'id',
            status: 400
          }
        ]
      });

      return;

    }

    let currentState;

    const queryParams = {
        id: msg.params.id
      };

    const promise = act({
        role: 'api',
        path: 'users',
        type: 'read',
        cmd: 'getUsers',
        args: queryParams,
        options: {}
      })
      .then( ( reply ) => {

        if ( _.isEmpty( reply.data ) ) {

          // Looks like this user does not exist

          done( null, { data: null });

          promise.cancel();

          return;

        }

        currentState = reply.data;

        return currentState;

      })
      .then( ( reply ) => {

        // User exists, check if we are authorized to update this user

        return act({
          role: 'api',
          path: 'authorize',
          cmd: 'userCan',
          consumerJWT: msg.consumerJWT,
          what: 'users:edit',
          context: {
            id: reply.id
          }
        });

      })
      .then( ( reply ) => {

        if ( ! reply.can ) {

          done( null, {
            errors: [
              {
                title: 'Unauthorized',
                detail: 'You are not authorized to do this.',
                status: 403
              }
            ]
          });

          promise.cancel();

          return;

        }

        return;

      })
      .then( () => {

        const toUpdate = _.cloneDeep( msg.body ),
          updated = {},
          patchUserPropsPromise = new Promise( ( resolve, reject ) => {

            function patchUserProps() {

              if ( _.isEmpty( toUpdate ) ) {

                resolve( updated );

                return;

              }

              const prop = Object.keys( toUpdate )[0];

              if (
                'undefined' !== typeof currentState[ prop ] &&
                currentState[ prop ] === toUpdate[ prop ]
              ) {

                delete toUpdate[ prop ];

                return patchUserProps();

              }

              if ( 'username' === prop ) {

                act({
                  role: 'api',
                  path: 'users',
                  cmd: 'validateUsername',
                  username: toUpdate.username
                })
                .then( ( reply ) => {

                  if ( ! _.isEmpty( reply.errors ) ) {

                    resolve( reply );

                    return;

                  }

                  updated.username = toUpdate.username;

                  delete toUpdate.username;

                  patchUserProps();

                })
                .catch( ( err ) => {

                  patchUserPropsPromise.cancel();

                  done( err, null );

                });

              } else if ( 'password' === prop ) {

                if ( ! msg.query || ! msg.query.token ) {

                  // You need a token to update the password
                  resolve({
                    errors: [
                      {
                        title: 'Token not valid',
                        detail: 'Token was not provided.',
                        propertyName: 'token',
                        status: 400
                      }
                    ]
                  });

                  return;

                }

                const passwordUpdatePromise = act({
                  role: 'api',
                  path: 'users',
                  cmd: 'validatePassword',
                  password: toUpdate.password
                })
                .then( ( reply ) => {

                  if ( ! _.isEmpty( reply.errors ) ) {

                    resolve( reply );

                    passwordUpdatePromise.cancel();

                    return;

                  }

                  return act({
                    role: 'api',
                    path: 'tokens',
                    cmd: 'getTokens',
                    args: {
                      id: msg.query.token
                    },
                    options: {}
                  });

                })
                .then( ( reply ) => {

                  if (
                    _.isEmpty( reply.data ) ||
                    currentState.id !== reply.data.userId ||
                    reply.data.type !== 'password:update'
                  ) {

                    // Looks like this token does not exist, or is not valid
                    resolve({
                      errors: [
                        {
                          title: 'Token not valid',
                          detail: 'Token is not valid or it expired.',
                          propertyName: 'token',
                          status: 400
                        }
                      ]
                    });

                    passwordUpdatePromise.cancel();

                    return;

                  }

                  return hashPassword( toUpdate.password );

                })
                .then( ( hashedPassword ) => {

                  updated.password = hashedPassword;

                  delete toUpdate.password;

                  return r.table( 'Token' ).get( msg.query.token ).delete().run();

                })
                .then( ( reply ) => {

                  patchUserProps();

                })
                .catch( ( err ) => {

                  patchUserPropsPromise.cancel();

                  done( err, null );

                });

              } else if ( 'emailConfirmed' === prop ) {

                if ( ! msg.query || ! msg.query.token ) {

                  // You need a token to update the emailConfirmed property
                  resolve({
                    errors: [
                      {
                        title: 'Token not valid',
                        detail: 'Token was not provided.',
                        propertyName: 'token',
                        status: 400
                      }
                    ]
                  });

                  return;

                }

                const getTokensPromise = act({
                  role: 'api',
                  path: 'tokens',
                  cmd: 'getTokens',
                  args: {
                    id: msg.query.token
                  },
                  options: {}
                })
                .then( ( reply ) => {

                  if (
                    _.isEmpty( reply.data ) ||
                    currentState.id !== reply.data.userId ||
                    reply.data.type !== 'emailConfirmed:update'
                  ) {

                    // Looks like this token does not exist, or is not valid
                    resolve({
                      errors: [
                        {
                          title: 'Token not valid',
                          detail: 'Token is not valid or it expired.',
                          propertyName: 'token',
                          status: 400
                        }
                      ]
                    });

                    getTokensPromise.cancel();

                    return;

                  }

                  updated.emailConfirmed = !! toUpdate.emailConfirmed;

                  delete toUpdate.emailConfirmed;

                  return r.table( 'Token' ).get( msg.query.token ).delete().run();

                })
                .then( ( reply ) => {

                  patchUserProps();

                })
                .catch( ( err ) => {

                  patchUserPropsPromise.cancel();

                  done( err, null );

                });

              } else if ( 'role' === prop ) {

                act({
                  role: 'api',
                  path: 'users',
                  cmd: 'validateRole',
                  userRole: toUpdate.role
                })
                .then( ( reply ) => {

                  if ( ! _.isEmpty( reply.errors ) ) {

                    resolve( reply );

                    return;

                  }

                  updated.role = toUpdate.role;

                  delete toUpdate.role;

                  patchUserProps();

                })
                .catch( ( err ) => {

                  patchUserPropsPromise.cancel();

                  done( err, null );

                });

              } else if ( 'signature' === prop ) {

                act({
                  role: 'api',
                  path: 'users',
                  cmd: 'validateSignature',
                  signature: toUpdate.signature
                })
                .then( ( reply ) => {

                  if ( ! _.isEmpty( reply.errors ) ) {

                    resolve( reply );

                    return;

                  }

                  updated.signature = toUpdate.signature;

                  delete toUpdate.signature;

                  patchUserProps();

                })
                .catch( ( err ) => {

                  patchUserPropsPromise.cancel();

                  done( err, null );

                });

              } else if ( 'color' === prop ) {

                act({
                  role: 'api',
                  path: 'users',
                  cmd: 'validateColor',
                  color: toUpdate.color
                })
                .then( ( reply ) => {

                  if ( ! _.isEmpty( reply.errors ) ) {

                    resolve( reply );

                    return;

                  }

                  updated.color = toUpdate.color;

                  delete toUpdate.color;

                  patchUserProps();

                })
                .catch( ( err ) => {

                  patchUserPropsPromise.cancel();

                  done( err, null );

                });

              } else {

                delete toUpdate[ prop ];

                return patchUserProps();

              }

            }

            patchUserProps();

          });

        return patchUserPropsPromise;

      })
      .then( ( updated ) => {

        if ( ! _.isEmpty( updated.errors ) ) {

          done( null, {
            errors: updated.errors
          });

          promise.cancel();

          return;

        }

        if ( ! _.isEmpty( updated ) ) {

          return r
            .table( 'User' )
            .get( currentState.id )
            .update( updated, { returnChanges: true } )
            .run();

        }

        return {
          replaced: 0
        };

      })
      .then( ( result ) => {

        if ( 0 === result.replaced ) {

          const data = currentState;

          delete data.password;

          done( null, {
            data: data
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
