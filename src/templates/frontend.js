// register({
//   'src': {
//     js: [
//       { entry: 'www/src/index.js', outfile: 'www/lib/js/all.js' }
//     ],
//     sass: { src: 'www/src/sass/**/*', outdir: 'lib/css' }
//   },
//   'lib': {
//     js: [
//       { outfile: 'www/lib/js/lib.js', files: [
//         'node_modules/foo/bar.js'
//       ]}
//     ],
//     css: [
//       { outfile: 'lib/css/vendor.bundle.css', files: [
//         'bower_components/foo/bar.css',
//         { path: 'bower_components/baz/qux.css', rewriteUrl: { from: '../', to: '/qux' } }
//       ]}
//     ],
//     copy: {
//       'bower_components/components-font-awesome/{css,fonts}/*': 'www/lib/components-font-awesome/'
//     }
//   }
// });

import { runConcurrent } from '../tools/util';
import {
  buildBundle,
  buildBundleMinified
} from '../tools/browserify';
import { concat as concatJs } from '../tools/js';
import {
  buildSass,
  concatStreams as concatCssStreams,
  rewriteUrlPrefix as rewriteCssUrlPrefix,
  rewriteUrl as rewriteCssUrl
} from '../tools/css';
import { copy } from '../tools/copy';

export function register( gulp, { projectDir, make } ) {
  var _ = require( 'lodash' );
  var path = require( 'path' );

  var jsTasks = [];
  var cssTasks = [];
  var copyTasks = [];
  var sassTasks = [];

  Object.keys( make ).forEach( name => {
    var groupTasks = [];
    var group = _.merge({
      js: [],
      sass: null,
      css: [],
      copy: {}
    }, make[ name ] );

    group.js = group.js.map( bundle => resolveJsBundle( bundle, projectDir ) );
    group.css = group.css.map( bundle => resolveCssBundle( bundle, projectDir ) );

    if ( group.js.length > 0 ) {
      let taskName = `make:${ name }:js`;
      gulp.task( taskName, function( done ) {
        var bundleTasks = group.js.map( bundle => {
          return done => buildJsBundle( bundle, done );
        });
        runConcurrent( bundleTasks, done );
      });
      jsTasks.push( taskName );
      groupTasks.push( taskName )
    }

    if ( group.css.length > 0 ) {
      let taskName = `make:${ name }:css`;
      gulp.task( taskName, function( done ) {
        var tasks = group.css.map( bundle => {
          return done => buildCssBundle( bundle, done );
        });
        runConcurrent( tasks, done );
      });
      cssTasks.push( taskName );
      groupTasks.push( taskName );
    }

    if ( group.sass ) {
      let taskName = `make:${ name }:sass`;
      gulp.task( taskName, function( done ) {
        buildSass(
          path.join( projectDir, group.sass.src ),
          path.join( projectDir, group.sass.outdir ),
          done
        );
      });
      sassTasks.push( taskName );
      groupTasks.push( taskName );
    }

    if ( Object.keys( group.copy ).length > 0 ) {
      let taskName = `make:${ name }:copy`;
      let filesToCopy = resolveCopyPaths( group.copy, projectDir );
      gulp.task( taskName, function( done ) {
        copy( filesToCopy, done );
      });
      copyTasks.push( taskName );
      groupTasks.push( taskName );
    }

    if ( groupTasks.length > 0 ) {
      gulp.task( `make:${ name }`, groupTasks );
    }
  });

  if ( jsTasks.length > 0 ) {
    gulp.task( 'make:js', jsTasks );
  }

  if ( cssTasks.length > 0 ) {
    gulp.task( 'make:css', cssTasks );
  }

  if ( copyTasks.length > 0 ) {
    gulp.task( 'make:copy', copyTasks );
  }

  if ( sassTasks.length > 0 ) {
    gulp.task( 'make:sass', sassTasks );
  }

  var makeTasks = jsTasks
    .concat( cssTasks )
    .concat( copyTasks )
    .concat( sassTasks );

  if ( makeTasks.length > 0 ) {
    gulp.task( 'make', makeTasks );
  }
};

export function resolveJsBundle( bundle, projectDir ) {
  var _ = require( 'lodash' );
  var path = require( 'path' );
  bundle = _.cloneDeep( bundle );
  bundle.outfile = path.join( projectDir, bundle.outfile );
  if ( bundle.entry ) {
    bundle.entry = path.join( projectDir, bundle.entry );
  } else {
    bundle.files = bundle.files.map( x => path.join( projectDir, x ) );
  }
  return bundle;
};

export function resolveCopyPaths( files, projectDir ) {
  var path = require( 'path' );
  return Object.keys( files ).map( file => {
    return {
      in: path.join( projectDir, file ),
      out: path.join( projectDir, files[ file ] )
    };
  }).reduce( ( acc, item ) => {
    acc[ item.in ] = item.out;
    return acc;
  }, {} );
};

export function resolveCssBundle( bundle, projectDir ) {
  var _ = require( 'lodash' );
  var path = require( 'path' );
  bundle = _.cloneDeep( bundle );
  bundle.outfile = path.join( projectDir, bundle.outfile );
  bundle.files = bundle.files.map( file => {
    if ( typeof file === 'string' ) {
      return path.join( projectDir, file );
    } else {
      file.path = path.join( projectDir, file.path );
      return file;
    }
  });
  return bundle;
};

export function buildJsBundle( bundle, done ) {
  var path = require( 'path' );
  if ( bundle.entry ) {
    var standard = done => {
      buildBundle( bundle.entry, bundle.outfile, {
        standalone: bundle.standalone
      }, done );
    };
    var minified = done => {
      buildBundleMinified(
        bundle.entry,
        path.dirname( bundle.outfile ) + '/' + path.basename( bundle.outfile, '.js' ) + '.min.js',
        {
          debug: false,
          standalone: bundle.standalone
        },
        done
      );
    };
    runConcurrent( [ standard, minified ], done );
  } else {
    concatJs( bundle.files, bundle.outfile, done );
  }
};

export function buildCssBundle( bundle, done ) {
  concatCssStreams(
    bundle.files.map( file => {
      if ( typeof file === 'string' ) {
        return gulp.src( file );
      } else {
        var stream = gulp.src( file.path );
        if ( file.rewriteUrl ) {
          if ( typeof file.rewriteUrl === 'function' ) {
            stream = stream.pipe( rewriteCssUrl( rewriteUrl ) );
          } else {
            stream = stream.pipe( rewriteCssUrlPrefix( file.rewriteUrl.from, file.rewriteUrl.to ) );
          }
        }
        return stream;
      }
    }),
    bundle.outfile,
    done
  );
};
