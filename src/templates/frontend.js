import {
  register as registerMakeTasks,
  makeJsBuilder,
  makeCssBuilder,
  makeSassBuilder,
  resolveGroups
} from '../tools/make';
import { watchGlob } from '../tools/watch';
import { makeCleanFunction } from '../tools/clean';
import { watchify } from '../tools/browserify';

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
    gulp.task( 'serve', function() {
      var path = require( 'path' );
      var browserSync = require( 'browser-sync' ).create();
      browserSync.init({
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

/**
 * @param {Object.<String, BuildGroup>} groups
 * @param {Function} callback
 */
export function watchGroups( groups, callback ) {
  var _ = require( 'lodash' );

  for ( let groupName in groups ) {
    let group = groups[ groupName ];
    if ( group.css ) {
      let paths = group.css.reduce( ( paths, task ) => {
        return paths.concat(
          task.files.map( file => typeof file === 'string' ? file : file.path )
        );
      }, [] );
      let buildCss = makeCssBuilder( group.css );
      watchGlob( paths, () => buildCss( callback ) );
    }

    if ( group.sass ) {
      let paths = group.sass.map( x => x.src );
      let buildSass = makeSassBuilder( group.sass, {
        continueOnError: true
      });
      watchGlob( paths, () => buildSass( callback ) );
    }

    if ( group.js ) {
      let concatTasks = group.js.filter( x => !!x.files );
      let pathsForConcat = concatTasks.reduce( ( paths, task ) => {
        return paths.concat( task.files );
      }, [] );
      let concatJs = makeJsBuilder( concatTasks );
      watchGlob( pathsForConcat, () => concatJs( callback ) );

      let browserifyTasks = group.js.filter( x => !!x.entry );
      browserifyTasks.forEach( task => {
        var { entry, outfile } = task;
        var options = _.cloneDeep( task );
        delete options.entry;
        delete options.outfile;
        watchify( entry, outfile, options, callback );
      });
    }
  }
};
