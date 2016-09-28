'use strict';

const Promise = require( 'bluebird' );
const validator = require( 'validator' );
const _ = require( 'lodash' );

module.exports = function () {

  // Promisify the seneca .act() method
  const act = Promise.promisify( this.act, { context: this });

  // Validate username
  this.add( 'role:api,path:users,cmd:validateUsername', function( msg, done ) {

    const username = msg.username;

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

    } else if ( 'string' !== typeof username ) {

      done( null, {
        errors: [
          {
            title: 'Username not valid',
            detail: 'Username has to be a string.',
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
    const queryParams = {
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

    const email = msg.email;

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

    } else if ( 'string' !== typeof email ) {

      done( null, {
        errors: [
          {
            title: 'Email not valid',
            detail: 'Email has to be a string.',
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
    const queryParams = {
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

    const password = msg.password;

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

    } else if ( 'string' !== typeof password ) {

      done( null, {
        errors: [
          {
            title: 'Password not valid',
            detail: 'Password has to be a string.',
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

  // Validate role
  this.add( 'role:api,path:users,cmd:validateRole', function( msg, done ) {

    const role = msg.userRole,
      allowedRoles = [
        'basic',
        'moderator',
        'administrator'
      ];

    if ( 'string' !== typeof role ) {

      done( null, {
        errors: [
          {
            title: 'Role not valid',
            detail: 'Role has to be a string.',
            propertyName: 'role',
            status: 400
          }
        ]
      });

      return;

    } else if ( -1 === allowedRoles.indexOf( role ) ) {

      done( null, {
        errors: [
          {
            title: 'Role not valid',
            detail: 'Role provided is not on a list of known roles.',
            propertyName: 'role',
            status: 400
          }
        ]
      });

      return;

    }

    done( null, {});

  });

  // Validate signature
  this.add( 'role:api,path:users,cmd:validateSignature', function( msg, done ) {

    const signature = msg.signature;

    if ( 'string' !== typeof signature ) {

      done( null, {
        errors: [
          {
            title: 'Signature not valid',
            detail: 'Signature has to be a string.',
            propertyName: 'signature',
            status: 400
          }
        ]
      });

      return;

    } else if ( ! validator.isLength( signature, 0, 30 ) ) {

      done( null, {
        errors: [
          {
            title: 'Signature not valid',
            detail: 'Signature can have up to 30 characters.',
            propertyName: 'signature',
            status: 400
          }
        ]
      });

      return;

    } else if ( signature.trim() !== signature ) {

      done( null, {
        errors: [
          {
            title: 'Signature not valid',
            detail: 'Whitespace was found at the start or at the end of the signature.',
            propertyName: 'signature',
            status: 400
          }
        ]
      });

      return;

    }

    done( null, {});

  });

  // Validate color
  this.add( 'role:api,path:users,cmd:validateColor', function( msg, done ) {

    const color = msg.color;

    if ( 'string' !== typeof color ) {

      done( null, {
        errors: [
          {
            title: 'Color not valid',
            detail: 'Color has to be a string.',
            propertyName: 'color',
            status: 400
          }
        ]
      });

      return;

    } else if ( ! validator.isHexColor( color ) ) {

      done( null, {
        errors: [
          {
            title: 'Color not valid',
            detail: 'A non-valid hex color was provided.',
            propertyName: 'color',
            status: 400
          }
        ]
      });

      return;

    }

    const rgbColor = colorHexToRgb( color );

    if ( colorIsTooBright( rgbColor, 70 ) ) {

      done( null, {
        errors: [
          {
            title: 'Color not valid',
            detail: 'Color provided is too bright.',
            propertyName: 'color',
            status: 400
          }
        ]
      });

      return;

    } else if ( colorIsTooDark( rgbColor, 25 ) ) {

      done( null, {
        errors: [
          {
            title: 'Color not valid',
            detail: 'Color provided is too dark.',
            propertyName: 'color',
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

// Checks whether the provided color is too bright
function colorIsTooBright( rgb, max ) {

  max = max || 0;

  const brightness = ( ( rgb.r * 299 ) + ( rgb.g * 587 ) + ( rgb.b * 114 ) ) / 2550;

  if ( brightness <= max ) {

    return false;

  }

  return true;

};

// Checks whether the provided color is too dark
function colorIsTooDark( rgb, min ) {

  min = min || 100;

  const brightness = ( ( rgb.r * 299 ) + ( rgb.g * 587 ) + ( rgb.b * 114 ) ) / 2550;

  if ( brightness >= min ) {

    return false;

  }

  return true;

};

// Converts hex color to rgb
function colorHexToRgb( hex ) {

	// Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
	const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
	hex = hex.replace( shorthandRegex, function( m, r, g, b ) {

		return r + r + g + g + b + b;

	});

	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec( hex );

  if ( ! result ) {

    return null;

  }

	return {
		r: parseInt( result[1], 16 ),
		g: parseInt( result[2], 16 ),
		b: parseInt( result[3], 16 )
	};

};
