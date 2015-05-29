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
