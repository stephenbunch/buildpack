import { run as runKarma } from './karma';
import { runSequential } from './util';

/**
 * @typedef {Object} Target
 * @property {String} specs
 * @property {Array.<String>} platforms
 */

/**
 * @param {Array.<Target>} targets
 */
export function runTargets( targets, done ) {
  runSequential(
    targets.map( target => {
      return done => {
        runTarget( target, done );
      };
    }),
    done
  );
};

/**
 * @param {Target} target
 * @param {Function} done
 */
export function runTarget( target, done ) {
  runSequential(
    target.platforms.map( platform => {
      if ( platform === 'node' ) {
        return done => testNode( target.specs, done );
      } else if ( platform === 'browser' ) {
        return done => testPhantomJs( target.specs, done );
      } else {
        return done => done();
      }
    }),
    done
  );
};

/**
 * @param {String} specs
 * @param {Function} done
 */
export function testNode( specs, done ) {
  var Mocha = require( 'mocha' );
  var chai = require( 'chai' );
  var glob = require( 'glob' );
  var sinon = require( 'sinon' );

  var sinonChai = require( 'sinon-chai' );
  chai.use( sinonChai );

  var mocha = new Mocha({ bail: true });
  global.expect = chai.expect;
  global.sinon = sinon;

  glob( specs, function( err, files ) {
    if ( err ) {
      return done( err );
    }
    files.forEach( file => mocha.addFile( file ) );
    mocha.run( function( failures ) {
      if ( failures > 0 ) {
        var err = new Error( 'Test suite failed with ' + failures + ' failures.' );
        err.failures = failures;
        done( err );
      } else {
        delete global.expect;
        delete global.sinon;
        done();
      }
    });
  });
};

/**
 * @param {String} specs
 * @param {Function} done
 */
export function testPhantomJs( specs, done ) {
  runKarma( specs, {
    browsers: [ 'PhantomJS' ]
  }, done );
};

/**
 * @param {Gulp} gulp
 * @param {Object.<String, Target>} targets
 */
export function register( gulp, targets ) {
  var targetsByPlatform = {};
  var all = [];

  Object.keys( targets ).forEach( name => {
    var target = targets[ name ];
    all.push( target );

    gulp.task( `test:${ name }`, done => runTarget( target, done ) );
    target.platforms.forEach( platform => {
      var singlePlatformTarget = {
        specs: target.specs,
        platforms: [ platform ]
      };
      gulp.task( `test:${ name }:${ platform }`, done => {
        runTarget( singlePlatformTarget, done );
      });
      if ( !targetsByPlatform[ platform ] ) {
        targetsByPlatform[ platform ] = [];
      }
      targetsByPlatform[ platform ].push( singlePlatformTarget );
    });
  });

  Object.keys( targetsByPlatform ).forEach( platform => {
    gulp.task( `test:${ platform }`, done => {
      runTargets( targetsByPlatform[ platform ], done );
    });
  });

  gulp.task( 'test', done => runTargets( all, done ) );
};
