import {
  makeJsBuilder,
  makeCssBuilder,
  makeSassBuilder
} from '../tools/make';
import { watchify } from '../tools/browserify';
import { copy } from '../tools/copy';
import { resolveDestinationFromGlob } from '../tools/util';
import { buildEjs } from '../tools/ejs';

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
  var _ = require( 'lodash' );

  for ( let groupName in groups ) {
    let group = groups[ groupName ];
    if ( group.css ) {
      group.css.forEach( task => {
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
      });
    }

    if ( group.sass ) {
      group.sass.forEach( task => {
        var buildSass = makeSassBuilder( [ task ], {
          continueOnError: true
        });
        var src = [ task.src ];
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
      });
    }

    if ( group.js ) {
      group.js.forEach( task => {
        if ( task.files ) {
          let concatJs = makeJsBuilder( [ task ] );
          watchGlob( task.files, () => concatJs( callback ) );
        } else {
          let { entry, outfile } = task;
          let options = _.cloneDeep( task );
          delete options.entry;
          delete options.outfile;
          watchify( entry, outfile, options, callback );
        }
      });
    }

    if ( group.copy ) {
      Object.keys( group.copy ).forEach( glob => {
        var dest = group.copy[ glob ];
        watchGlob( glob, ( path, type ) => {
          if ( type !== 'unlink' ) {
            copy({
              [ path ]: resolveDestinationFromGlob( path, dest, glob )
            }, callback );
          }
        });
      });
    }

    if ( group.ejs ) {
      group.ejs.forEach( task => {
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
      });
    }
  }
};
