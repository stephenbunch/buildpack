import { serve } from '../tools/node';
import { register as registerCommon } from './common';

export function register( gulp, options ) {
  var { projectDir, entry } = options;

  gulp.task( 'serve', function() {
    var path = require( 'path' );
    var browserSync;
    serve( path.resolve( projectDir, entry ), options, function( message ) {
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

  registerCommon( gulp, projectDir );
};
