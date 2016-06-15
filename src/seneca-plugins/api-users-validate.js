'use strict';

const Promise = require( 'bluebird' );
const validator = require( 'validator' );
const _ = require( 'lodash' );

module.exports = function () {

  // Promisify the seneca .act() method
  let act = Promise.promisify( this.act, { context: this });

  // Validate username
  this.add( 'role:api,path:users,cmd:validateUsername', function( msg, done ) {

    let username = msg.username;

    if ( ! username ) {

      done( null, {
        errors: [
          {
            title: 'Username not valid',
            detail: 'Username was not provided.',
            propertyName: 'username',
            status: 400
          }
        ]
      });

      return;

    } else if ( ! validator.isLength( username, 2 ) ) {

      done( null, {
        errors: [
          {
            title: 'Username not valid',
            detail: 'Username has to have at least two characters.',
            propertyName: 'username',
            status: 400
          }
        ]
      });

      return;

    } else if ( ! validator.isLength( username, 2, 20 ) ) {

      done( null, {
        errors: [
          {
            title: 'Username not valid',
            detail: 'Username can have up to 20 characters.',
            propertyName: 'username',
            status: 400
          }
        ]
      });

      return;

    } else if ( username.trim() !== username ) {

      done( null, {
        errors: [
          {
            title: 'Username not valid',
            detail: 'Whitespace was found at the start or at the end of the username.',
            propertyName: 'username',
            status: 400
          }
        ]
      });

      return;

    } else if ( username.replace( '  ', '' ) !== username ) {

      done( null, {
        errors: [
          {
            title: 'Username not valid',
            detail: 'Double whitespace is not allowed in the username.',
            propertyName: 'username',
            status: 400
          }
        ]
      });

      return;

    } else if ( username !== validator.escape( username ) || -1 !== username.indexOf( '-' ) || ! validator.isAscii( username ) ) {

      done( null, {
        errors: [
          {
            title: 'Username not valid',
            detail: 'A non-valid character (<>&\'"\\/- or a non ASCII) was found in your username.',
            propertyName: 'username',
            status: 400
          }
        ]
      });

      return;

    }

    // Syntax seems valid, lets check if username is already taken in the database
    let queryParams = {
        username: username
      };

    act({
        role: 'api',
        path: 'users',
        type: 'read',
        cmd: 'getUsers',
        args: queryParams,
        options: {}
      })
      .then( ( reply ) => {

        if ( ! _.isEmpty( reply.data ) ) {

          // Looks like this username is already taken

          done( null, {
            errors: [
              {
                title: 'Username not valid',
                detail: 'This username is already taken.',
                propertyName: 'username',
                status: 400
              }
            ]
          });

          return;

        }

        done( null, {});

      })
      .catch( ( err ) => {

        done( err, null );

      });

  });

  // Validate email
  this.add( 'role:api,path:users,cmd:validateEmail', function( msg, done ) {

    let email = msg.email;

    if ( ! email ) {

      done( null, {
        errors: [
          {
            title: 'Email not valid',
            detail: 'Email was not provided.',
            propertyName: 'email',
            status: 400
          }
        ]
      });

      return;

    } else if ( ! validator.isEmail( email ) ) {

      done( null, {
        errors: [
          {
            title: 'Email not valid',
            detail: 'A non-valid email was provided.',
            propertyName: 'email',
            status: 400
          }
        ]
      });

      return;

    }

    // Syntax seems valid, lets check if email is already taken in the database
    let queryParams = {
        email: email
      };

    act({
        role: 'api',
        path: 'users',
        type: 'read',
        cmd: 'getUsers',
        args: queryParams,
        options: {}
      })
      .then( ( reply ) => {

        if ( ! _.isEmpty( reply.data ) ) {

          // Looks like this email is already taken

          done( null, {
            errors: [
              {
                title: 'Email not valid',
                detail: 'This email is already taken.',
                propertyName: 'email',
                status: 400
              }
            ]
          });

          return;

        }

        done( null, {});

      })
      .catch( ( err ) => {

        done( err, null );

      });

  });

  // Validate password
  this.add( 'role:api,path:users,cmd:validatePassword', function( msg, done ) {

    let password = msg.password;

    if ( ! password ) {

      done( null, {
        errors: [
          {
            title: 'Password not valid',
            detail: 'Password was not provided.',
            propertyName: 'password',
            status: 400
          }
        ]
      });

      return;

    } else if ( ! validator.isLength( password, 8 ) ) {

      done( null, {
        errors: [
          {
            title: 'Password not valid',
            detail: 'Password has to be at least 8 characters long.',
            propertyName: 'password',
            status: 400
          }
        ]
      });

      return;

    }

    done( null, {});

  });

  return {
    name: 'api-users-validate'
  };

};
