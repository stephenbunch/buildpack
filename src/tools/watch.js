import {
  makeJsBuilder,
  makeCssBuilder,
  makeSassBuilder
} from '../tools/make';
import { watchify } from '../tools/browserify';

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
    watcher.on( 'add', callback );
    watcher.on( 'unlink', callback );
    watcher.on( 'change', callback );
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
