import { watchGlob } from './watch';

/**
 * @param {String} entryFile
 * @param {Object} [opts]
 * @param {Function} callback
 * @returns {Function}
 */
export function serve( entryFile, opts, callback ) {
  var path = require( 'path' );
  var app;
  var restart = () => {
    if ( app ) {
      app.kill();
    }
    app = start( entryFile, opts, callback );
  };
  var unwatch = watchGlob( path.dirname( entryFile ), restart );
  restart();
  return {
    restart: restart,
    kill() {
      unwatch();
      app.kill();
    }
  };
};

/**
 * @param {String} entryFile
 * @param {Object} [opts]
 * @param {Array.<String>} [opts.appArgs]
 * @param {Array.<String>} [opts.nodeArgs]
 * @param {Function} callback
 * @returns {ChildProcess}
 */
export function start( entryFile, opts, callback ) {
  if ( typeof opts === 'function' ) {
    callback = opts;
    opts = {};
  }
  var fork = require( 'child_process' ).fork;
  var app = fork( entryFile, opts.appArgs || [], {
    execArgv: ( opts.nodeArgs || [] ).concat([
      '--harmony'
    ])
  });
  app.on( 'message', function( message ) {
    try {
      message = JSON.parse( message );
      if ( message.status === 'online' ) {
        callback( message );
      }
    } catch ( err ) {
      console.warn( err );
    }
  });
  return app;
};
