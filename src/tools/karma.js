import path from 'path';
const APP_ROOT = path.resolve( __dirname + '/../..' );

/**
 * @param {String} specFiles Glob for spec files.
 * @returns {Object}
 */
export function defaultOptions( specFiles ) {
  return {
    frameworks: [ 'mocha', 'browserify' ],
    files: [
      APP_ROOT + '/node_modules/chai/chai.js',
      APP_ROOT + '/node_modules/sinon/pkg/sinon.js',
      APP_ROOT + '/node_modules/sinon-chai/lib/sinon-chai.js',
      APP_ROOT + '/node_modules/babel/node_modules/babel-core/browser-polyfill.js',
      APP_ROOT + '/karma_helpers.js',
      specFiles
    ],
    reporters: [ 'progress' ],
    port: 9876,
    colors: true,
    autoWatch: false,
    singleRun: false,
    browsers: [ 'ChromeCanary' ],
    logLevel: 'INFO',
    captureConsole: true,
    preprocessors: {
      [ specFiles ]: 'browserify'
    },
    browserify: {
      debug: true,
      transform: [ require.resolve( 'babelify' ) ]
    },
    plugins: [
      require.resolve( 'karma-browserify' ),
      require.resolve( 'karma-mocha' ),
      require.resolve( 'karma-chrome-launcher' ),
      require.resolve( 'karma-phantomjs-launcher' )
    ]
  };
};

/**
 * @param {String} specFiles
 * @param {Object} [opts]
 * @param {Function} done
 */
export function run( specFiles, opts, done ) {
  if ( typeof opts === 'function' ) {
    done = opts;
    opts = {};
  }
  var { server } = require( 'karma' );
  var _ = require( 'lodash' );
  server.start(
    _.extend( defaultOptions( specFiles ), opts, { singleRun: true } ),
    exitCode => done()
  );
};

/**
 * @param {String} specFiles
 * @param {Object} [opts]
 * @returns {Object}
 */
export function serve( specFiles, opts ) {
  var _ = require( 'lodash' );
  var { server, runner } = require( 'karma' );
  server.start(
    _.extend( defaultOptions( specFiles ), opts ),
    () => runner.run( {} )
  );
  return {
    reload: () => {
      runner.run( {} );
    }
  };
};
