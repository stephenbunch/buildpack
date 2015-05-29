import { serve as serveApp } from '../tools/node';
import {
  register as registerMakeTasks,
  resolveGroups
} from '../tools/make';
import { watchGlob } from '../tools/watch';
import { makeCleanFunction } from '../tools/clean';
import { watchGroups } from './frontend';

export function register( gulp, options ) {
  var { projectDir, serve, make, clean } = options;

  if ( make ) {
    registerMakeTasks( gulp, make, projectDir );
  }

  if ( clean ) {
    let cleanFunc = makeCleanFunction( clean, projectDir );
    gulp.task( 'clean', cleanFunc );
  }

  if ( serve ) {
    gulp.task( 'serve', function() {
      var path = require( 'path' );
      var browserSync;

      var app = serveApp( path.resolve( projectDir, serve.entry ), serve, function( message ) {
        if ( !browserSync ) {
          browserSync = require( 'browser-sync' ).create();
          browserSync.init({
            proxy: `localhost:${ message.port }`
          });
        } else {
          browserSync.reload();
        }
      });

      var reload = () => {
        if ( browserSync ) {
          browserSync.reload();
        }
      };

      if ( serve.watch ) {
        watchGlob( serve.watch, () => app.restart() );
      }

      if ( make ) {
        watchGroups( resolveGroups( make, projectDir ), reload );
      }
    });
  }
};
