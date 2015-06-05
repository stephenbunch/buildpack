require( 'harmonize' )();
require( 'babel/register' );

module.exports = function( gulp, config ) {
  var register = require( './lib/templates/' + config.template ).register;
  gulp.task( 'help', require( 'gulp-task-listing' ).use( gulp ).withFilters( /:/ ) );
  register( gulp, config.options );
};
