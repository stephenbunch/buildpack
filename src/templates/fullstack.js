import { serve as serveApp } from '../tools/node';
import {
  register as registerMakeTasks,
  resolveGroups
} from '../tools/make';
import { watchGlob, watchGroups } from '../tools/watch';
import { makeCleanFunction } from '../tools/clean';
import { incrementBuild, tagVersion, updateHooks } from '../tools/git';
import { generateSecret } from '../tools/generate';

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
    gulp.task( 'serve', function() {
      var path = require( 'path' );
      var browserSync;

      var app = serveApp( path.resolve( projectDir, serve.entry ), serve, async function( message ) {
        if ( !browserSync ) {
          var portfinder = require( 'portfinder' );
          portfinder.basePort = 3000;
          var getPortAsync = Promise.promisify( portfinder.getPort );

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
        watchGroups( resolveGroups( make, projectDir ), reload );
      }
    });
  }

  gulp.task( 'git:increment-build', function( done ) {
    incrementBuild( projectDir + '/package.json', projectDir + '/version.json', done );
  });

  gulp.task( 'git:tag-version', function( done ) {
    tagVersion( projectDir + '/version.json', done );
  });

  gulp.task( 'git:update-hooks', function() {
    updateHooks( projectDir, projectDir + '/hooks' );
  });

  gulp.task( 'secret', function( done ) {
    generateSecret( function( err, secret ) {
      if ( err ) {
        return done( err );
      }
      console.log( secret );
      done();
    });
  });
};
