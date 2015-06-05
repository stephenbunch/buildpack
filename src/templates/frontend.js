import {
  register as registerMakeTasks,
  makeJsBuilder,
  makeCssBuilder,
  makeSassBuilder,
  resolveGroups
} from '../tools/make';
import { watchGlob, watchGroups } from '../tools/watch';
import { makeCleanFunction } from '../tools/clean';
import { watchify } from '../tools/browserify';
import { Promise } from 'bluebird';

// Example ____________________________________________________________________

// ```js
// register( gulp, {
//   projectDir: __dirname,
//   make: {
//     'src': {
//       js: [
//         { entry: 'www/src/index.js', outfile: 'www/lib/js/all.js' }
//       ],
//       sass: [
//         { src: 'www/src/sass/**/*', outdir: 'lib/css' }
//       ]
//     },
//     'lib': {
//       js: [
//         { outfile: 'www/lib/js/lib.js', files: [
//           'node_modules/foo/bar.js'
//         ]}
//       ],
//       css: [
//         { outfile: 'lib/css/vendor.bundle.css', files: [
//           'bower_components/foo/bar.css',
//           { path: 'bower_components/baz/qux.css', rewriteUrl: { from: '../', to: '/qux' } }
//         ]}
//       ],
//       copy: {
//         'bower_components/components-font-awesome/{css,fonts}/*': 'www/lib/components-font-awesome/'
//       }
//     }
//   },
//   serve: {
//     baseDir: 'www',
//     watch: [ 'config.json' ]
//   },
//   clean: [ 'www/lib' ]
// });
// ```

/**
 * @param {Gulp} gulp
 * @param {Object} options
 */
export function register( gulp, options ) {
  var { projectDir, make, clean, serve } = options;

  if ( make ) {
    registerMakeTasks( gulp, make, projectDir );
    gulp.task( 'default', [ 'make' ] );
  }

  if ( clean ) {
    let cleanFunc = makeCleanFunction( clean, projectDir );
    gulp.task( 'clean', cleanFunc );
  }

  if ( serve ) {
    gulp.task( 'serve', async function() {
      var path = require( 'path' );
      var browserSync = require( 'browser-sync' ).create();
      var portfinder = require( 'portfinder' );
      portfinder.basePort = 3000;
      var getPortAsync = Promise.promisify( portfinder.getPort );

      browserSync.init({
        port: await getPortAsync(),
        ui: {
          port: await getPortAsync()
        },
        server: {
          baseDir: path.resolve( projectDir, serve.baseDir )
        }
      });

      var reload = () => browserSync.reload();

      if ( serve.watch ) {
        watchGlob( serve.watch, reload );
      }

      if ( make ) {
        watchGroups( resolveGroups( make, projectDir ), reload );
      }
    });
  }
};
