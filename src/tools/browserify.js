import { defaultOptions } from './babel';

/**
 * @param {String} entryFile
 * @param {String} outfile
 * @param {Object} [opts]
 * @param {Function} done
 * @returns {stream.Readable}
 */
export function buildBundle( entryFile, outfile, opts, done ) {
  if ( typeof opts === 'function' ) {
    done = opts;
    opts = {};
  }
  return bundle( browserify( entryFile, opts ), outfile, done );
};

export function buildBundleMinified( entryFile, outfile, opts, done ) {
  if ( typeof opts === 'function' ) {
    done = opts;
    opts = {};
  }
  return bundle( browserifyMinify( entryFile, opts ), outfile, done );
};

/**
 * @param {String} entryFile
 * @param {Object} [opts]
 * @returns {Browserify}
 */
export function browserify( entryFile, opts ) {
  var _ = require( 'lodash' );
  var browserify = require( 'browserify' );
  var babelify = require( 'babelify' );
  var path = require( 'path' );

  opts = _.extend({
    entries: entryFile,
    debug: true
  }, opts );

  return (
    browserify( opts )
      .transform(
        babelify.configure(
          _.extend( defaultOptions( path.dirname( entryFile ) ), {
            sourceMapRelative: path.dirname( entryFile )
          })
        )
      )
      .transform( require.resolve( 'require-globify' ) )
  );
};

export function browserifyMinify( entryFile, opts ) {
  return browserify( entryFile, opts )
    .transform( require.resolve( 'uglifyify' ) );
};

/**
 * @param {Browserify}
 * @param {String} outfile
 * @param {Object} [opts]
 * @param {Boolean} [opts.continueOnError]
 * @param {Function} done
 * @returns {stream.Readable}
 */
export function bundle( browserify, outfile, opts, done ) {
  if ( typeof opts === 'function' ) {
    done = opts;
    opts = {};
  }

  var source = require( 'vinyl-source-stream' );
  var path = require( 'path' );
  var gulp = require( 'gulp' );

  var outdir = path.dirname( outfile );
  var outname = path.basename( outfile );

  var stream = browserify.bundle();
  if ( opts && opts.continueOnError ) {
    stream.on( 'error', err => console.log( err ) );
  }

  return stream
    .pipe( source( outname ) )
    .pipe( gulp.dest( outdir ) )
    .on( 'end', done );
};

/**
 * @param {String} entryFile
 * @param {String} outfile
 * @param {Object} [opts]
 * @param {Function} callback
 * @returns {Function}
 */
export function watchify( entryFile, outfile, opts, callback ) {
  if ( typeof opts === 'function' ) {
    callback = opts;
    opts = {};
  }

  var path = require( 'path' );
  var watchify = require( 'watchify' );
  var _ = require( 'lodash' );
  var chokidar = require( 'chokidar' );

  var b = watchify(
    browserify(
      entryFile,
      _.extend( opts, watchify.args )
    )
  );

  var makeJs = () => {
    bundle( b, outfile, {
      continueOnError: true
    }, callback );
  };

  b.on( 'update', makeJs );

  // Since we typically use a di container to link code across a project
  // rather than module imports, watchify isn't able to detect new and
  // removed files since all the module imports happen in the index.js file
  // dynamically using the globify transform. So we'll use fireworm to
  // detect changes and tell browserify that the index file changed.
  var watcher = chokidar.watch( path.dirname( entryFile ) );
  watcher.on( 'add', file => b.invalidate( entryFile ) );
  watcher.on( 'unlink', file => b.invalidate( entryFile ) );

  makeJs();

  return () => {
    b.close();
    watcher.close();
  };
};
