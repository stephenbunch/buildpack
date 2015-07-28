import {
  makeJsBuilder,
  makeCssBuilder,
  makeSassBuilder
} from '../tools/make';
import { watchify } from '../tools/browserify';
import { copy } from '../tools/copy';
import { resolveDestinationFromGlob } from '../tools/util';
import { buildEjs } from '../tools/ejs';
import gulp from 'gulp';

/**
 * @param {String|Array.<String>} paths
 * @param {Function} callback
 * @returns {Function}
 */
export function watchGlob( paths, callback ) {
  if ( paths ) {
    if ( typeof paths === 'string' ) {
      paths = [ paths ];
    }
    if ( paths.length > 0 ) {
      var chokidar = require( 'chokidar' );
      var watcher = chokidar.watch( paths, {
        ignoreInitial: true
      });
      watcher.on( 'add', path => callback( path, 'add' ) );
      watcher.on( 'unlink', path => callback( path, 'unlink' ) );
      watcher.on( 'change', path => callback( path, 'change' ) );

      // Until this issue gets resolved, globbing over symlinks doesn't work.
      // https://github.com/paulmillr/chokidar/issues/293
      var glob = require( 'glob' );
      var files = paths.map( x => glob.sync( x ) ).reduce( ( all, files ) => {
        return all.concat( files );
      }, [] );
      watcher.add( files );
    }
  }
  return () => {
    if ( watcher ) {
      watcher.close();
      watcher = null;
    }
  };
};

/**
 * @param {Object.<String, BuildGroup>} groups
 * @param {Function} callback
 * @param {Function} transform
 */
export function watchGroups( groups, callback, transform ) {
  for ( let groupName in groups ) {
    let group = groups[ groupName ];
    if ( group.css ) {
      group.css.forEach( task => watchCssTask( task, callback, transform ) );
    }

    if ( group.sass ) {
      group.sass.forEach( task => watchSassTask( task, callback, transform ) );
    }

    if ( group.js ) {
      group.js.forEach( task => watchJsTask( task, callback ) );
    }

    if ( group.copy ) {
      Object.keys( group.copy ).forEach( glob => {
        var destDir = group.copy[ glob ];
        watchGlob( glob, ( path, type ) => {
          if ( type !== 'unlink' ) {
            let destPath = resolveDestinationFromGlob( path, destDir, glob );
            if ( path.endsWith( '.css' ) ) {
              console.log( destPath );
              transform( gulp.src( path ).pipe( gulp.dest( destPath ) ) );
            } else {
              gulp.src( path ).pipe( gulp.dest( destPath ) ).on( 'end', callback );
            }
          }
        });
      });
    }

    if ( group.ejs ) {
      group.ejs.forEach( task => watchEjsTask( task, callback ) );
    }
  }
};

function watchCssTask( task, callback, transform ) {
  var paths = task.files.map( file => typeof file === 'string' ? file : file.path );
  var buildCss = makeCssBuilder( [ task ] );
  watchGlob( paths, () => {
    var stream = buildCss();
    if ( transform ) {
      stream = transform( stream );
    } else {
      stream.on( 'end', callback );
    }
  });
}

function watchSassTask( task, callback, transform ) {
  var path = require( 'path' );
  var buildSass = makeSassBuilder( [ task ], {
    continueOnError: true
  });
  var src = [ path.dirname( task.entry ) + '/**/*.scss' ];
  if ( task.includePaths ) {
    src = src.concat( task.includePaths.map( x => x + '/**/*.scss' ) );
  }
  if ( task.prepend ) {
    src = src.concat( task.prepend );
  }
  watchGlob( src, () => {
    var stream = buildSass();
    if ( transform ) {
      stream = transform( stream );
    } else {
      stream.on( 'end', callback );
    }
  });
}

function watchJsTask( task, callback ) {
  var _ = require( 'lodash' );
  var path = require( 'path' );
  if ( task.files ) {
    let concatJs = makeJsBuilder( [ task ] );
    watchGlob( task.files, () => concatJs( callback ) );
  } else {
    let { entry, outfile } = task;
    let options = _.cloneDeep( task );
    delete options.entry;
    delete options.outfile;
    watchify( entry, outfile, options, callback );

    // So for some reason, if I run both watchifies at the same time, it crashes
    // in the sourcemaps module as soon as a rebuild is triggered. Also, if I
    // run the minified watchify by itself, it builds fine, but the task
    // watching the minified file doesn't register a change and the browser
    // never refreshes. wtf...

    // let minOptions = _.cloneDeep( options );
    // _.extend( minOptions, {
    //   debug: false,
    //   uglify: true
    // });
    // let minOutfile =
    //   path.dirname( outfile ) + '/' +
    //   path.basename( outfile, '.js' ) + '.min.js';
    // watchify( entry, minOutfile, minOptions, callback );
  }
}

function watchEjsTask( task, callback ) {
  watchGlob( task.src, ( path, type ) => {
    if ( type !== 'unlink' ) {
      buildEjs(
        path,
        resolveDestinationFromGlob( path, task.outdir, task.src ),
        {
          continueOnError: true,
          context: task.context
        },
        callback
      );
    }
  });
}
