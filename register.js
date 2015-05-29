require( 'babel/register' );

module.exports = function( gulp, config ) {
  var register = require( './lib/templates/' + config.template ).register;
  register( gulp, config.options );
};
