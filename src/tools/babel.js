import { baseFromGlob } from './util';

/**
 * @param {String} dirname
 * @returns {Object}
 */
export function defaultOptions( dirname ) {
  var _ = require( 'lodash' );
  var opts = {
    sourceRoot: dirname
  };

  // Babel only looks in the current working directory for babelrc files.
  // For library projects, having one babelrc at the project root is enough.
  // But for web projects that contain both web and node code, we'll want to
  // be able to specify different babel configurations for each platform (eg.
  // use generators in node but not on web).
  _.extend( opts, resolveRc( dirname ) );

  return opts;
};

/**
 * @param {String} dirname
 * @returns {Object}
 */
export function resolveRc( dirname ) {
  var fs = require( 'fs' );
  var stripJsonComments = require( 'strip-json-comments' );
  if ( fs.existsSync( dirname + '/.babelrc' ) ) {
    var babelrc = fs.readFileSync( dirname + '/.babelrc', 'utf8' );
    try {
      return JSON.parse( stripJsonComments( babelrc ) );
    } catch ( err ) {
      console.log( err );
    }
  }
  return {};
};

/**
 * @param {String} sourceGlob
 * @param {String} outdir
 * @param {Object} [opts]
 * @param {Boolean} [opts.continueOnError]
 * @param {Function} done
 * @returns {stream.Readable}
 */
export function babel( sourceGlob, outdir, opts, done ) {
  if ( typeof opts === 'function' ) {
    done = opts;
    opts = {};
  }
  var gulp = require( 'gulp' );
  var babel = require( 'gulp-babel' );
  var stream = gulp.src( sourceGlob )
    .pipe( babel( defaultOptions( baseFromGlob( sourceGlob ) ) ) );
  if ( opts && opts.continueOnError ) {
    stream.on( 'error', err => console.log( err ) );
  } else {
    stream.on( 'error', done );
  }
  return (
    stream.pipe( gulp.dest( outdir ) )
      .on( 'error', done )
      .on( 'end', done )
  );
};
