import { serve as serveApp } from '../tools/node';
import {
  register as registerMakeTasks,
  resolveGroups
} from '../tools/make';
import { watchGlob, watchGroups } from '../tools/watch';
import { makeCleanFunction } from '../tools/clean';
import { register as registerCommon } from './common';
import { Promise } from 'bluebird';

export function register( gulp, options ) {
  var { projectDir, serve, make, clean } = options;

  if ( make ) {
    registerMakeTasks( gulp, make, projectDir );
    gulp.task( 'default', [ 'make' ] );
  }

  if ( clean ) {
    let cleanFunc = makeCleanFunction( clean, projectDir );
    gulp.task( 'clean', cleanFunc );
  }

  if ( serve ) {
    gulp.task( 'serve', function( done ) {
      var path = require( 'path' );
      var portfinder = require( 'portfinder' );
      portfinder.basePort = 3000;
      var getPortAsync = Promise.promisify( portfinder.getPort );
      var browserSync;

      var app = serveApp( path.resolve( projectDir, serve.entry ), serve, async function( message ) {
        if ( !browserSync ) {
          browserSync = require( 'browser-sync' ).create();
          browserSync.init({
            ui: {
              port: await getPortAsync()
            },
            port: await getPortAsync(),
            proxy: `localhost:${ message.port }`
          });
        } else {
          browserSync.reload();
        }
        done();
        done = () => {};
      });

      var reload = () => {
        if ( browserSync ) {
          browserSync.reload();
        }
      };

      if ( serve.watch ) {
        watchGlob( serve.watch, reload );
      }

      if ( make ) {
        watchGroups(
          resolveGroups( make, projectDir ),
          reload,
          stream => stream.pipe( browserSync.stream() )
        );
      }
    });
  }

  registerCommon( gulp, projectDir );
};
