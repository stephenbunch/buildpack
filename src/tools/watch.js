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
  if ( paths && ( typeof paths === 'string' || paths.length > 0 ) ) {
    var chokidar = require( 'chokidar' );
    var watcher = chokidar.watch( paths, {
      ignoreInitial: true
    });
    watcher.on( 'add', path => callback( path, 'add' ) );
    watcher.on( 'unlink', path => callback( path, 'unlink' ) );
    watcher.on( 'change', path => callback( path, 'change' ) );
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
 */
export function watchGroups( groups, callback ) {
  var _ = require( 'lodash' );

  for ( let groupName in groups ) {
    let group = groups[ groupName ];
    if ( group.css ) {
      group.css.forEach( task => {
        var paths = task.files.map( file => typeof file === 'string' ? file : file.path );
        var buildCss = makeCssBuilder( [ task ] );
        watchGlob( paths, () => buildCss( callback ) );
      });
    }

    if ( group.sass ) {
      group.sass.forEach( task => {
        var buildSass = makeSassBuilder( [ task ], {
          continueOnError: true
        });
        watchGlob( task.src, () => buildSass( callback ) );
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
