require( 'harmonize' )();
require( 'babel/register' );

var gulp = require( 'gulp' );

gulp.task( 'make', function( done ) {
  var babel = require( './src/tools/babel' ).babel;
  babel( 'src/**/*', 'lib/', done );
});

gulp.task( 'clean', function( done ) {
  require( 'del' )( 'lib/', done );
});

gulp.task( 'default', [ 'make' ] );
