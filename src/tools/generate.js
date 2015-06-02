export function generateSecret( done ) {
  var crypto = require( 'crypto' );
  crypto.randomBytes( 256, function( err, buf ) {
    if ( err ) {
      return done( err );
    }
    done( null, buf.toString( 'base64' ) );
  });
};
