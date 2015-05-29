import { serve } from '../tools/node';

export function register( gulp, options ) {
  gulp.task( 'serve', function() {
    var path = require( 'path' );
    var browserSync;
    serve( path.resolve( options.projectDir, options.entry ), options, function( message ) {
      if ( !browserSync ) {
        browserSync = require( 'browser-sync' ).create();
        browserSync.init({
          proxy: `localhost:${ message.port }`
        });
      } else {
        browserSync.reload();
      }
    });
  });
};
