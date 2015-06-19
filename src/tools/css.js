import { baseFromGlob } from './util';

/**
 * @param {String} sourceGlob Source glob.
 * @param {String} outdir Destination path.
 * @param {Object} [opts]
 * @param {Boolean} [opts.continueOnError]
 * @param {Function} [done]
 * @returns {stream.Readable}
 */
export function buildSass( sourceGlob, outdir, opts, done ) {
  if ( typeof opts === 'function' ) {
    done = opts;
    opts = {};
  }

  var gulp = require( 'gulp' );
  var sass = require( 'gulp-sass' );
  var minify = require( 'gulp-minify-css' );
  var rename = require( 'gulp-rename' );
  var postcss = require( 'gulp-postcss' );
  var autoprefixer = require( 'autoprefixer-core' );
  var filter = require( 'gulp-filter' );
  var path = require( 'path' );
  var clone = require( 'gulp-clone' );
  var debug = require( 'gulp-debug' );

  var stream = gulp.src( sourceGlob )
    .pipe( filter( file => !/^_/.test( path.basename( file.path ) ) ) )
    .pipe(
      sass({
        loadPath: [ baseFromGlob( sourceGlob ) ],
        errLogToConsole: true
      })
    );

  if ( opts && opts.continueOnError ) {
    stream.on( 'error', err => console.log( err ) );
  }

  var cloneSink = clone.sink();
  return stream
    .pipe(
      postcss([
        autoprefixer({
          browsers: [ 'last 2 versions' ]
        })
      ])
    )
    .pipe( cloneSink )
    .pipe(
      minify({
        keepSpecialComments: 0
      })
    )
    .pipe( rename({ extname: '.min.css' }) )
    .pipe( cloneSink.tap() )
    .pipe( gulp.dest( outdir ) )
    .on( 'end', done || ( () => {} ) );
}

/**
 * Returns a transform stream that rewrites the url values in CSS files.
 * @param {Function} callback
 *   An async callback that takes a url and returns a new url.
 * @returns {stream.Transform}
 */
export function rewriteUrl( callback ) {
  var through2 = require( 'through2' );
  var rework = require( 'rework' );
  var reworkUrl = require( 'rework-plugin-url' );
  var path = require( 'path' );

  return through2.obj( function( file, enc, done ) {
    // Skip non css files.
    if ( path.extname( file.path ) !== '.css' ) {
      this.push( file );
      done();
      return;
    }

    var urls = {};
    var contents = file.contents.toString();

    // Run through the file contents and gather the urls to be rewritten.
    rework( contents ).use(
      reworkUrl( url => {
        urls[ url ] = url;
        return url;
      })
    ).toString();

    // Run the map function over each url asynchronously. When all urls
    // have been rewritten, write the new contents to the file object
    // and finish the transform.
    Promise.all(
      Object.keys( urls ).map( url => {
        return Promise.resolve( callback( url ) ).then( result => {
          urls[ url ] = result;
        });
      })
    ).then( () => {
      var css = rework( contents ).use(
        reworkUrl( function( url ) {
          return urls[ url ];
        })
      ).toString();
      file.contents = new Buffer( css );
      this.push( file );
      done();
    }, err => {
      console.error( err );
      done( err );
    });
  });
};

export function rewriteUrlPrefix( fromPrefix, toPrefix ) {
  return rewriteUrl( url => {
    if ( url.indexOf( fromPrefix ) === 0 ) {
      return toPrefix + url.substr( fromPrefix.length );
    }
    return url;
  });
};

/**
 * @param {Array.<String>|String} files
 * @param {String} outfile
 * @param {Function} done
 */
export function concat( files, outfile, done ) {
  return concatStreams( [ gulp.src( files ) ], outfile, done );
};

/**
 * @param {Array.<stream.Readable>} streams
 * @param {String} outfile
 * @param {Function} [done]
 * @returns {stream.Readable}
 */
export function concatStreams( streams, outfile, done ) {
  var path = require( 'path' );
  var concat = require( 'gulp-concat' );
  var sourcemaps = require( 'gulp-sourcemaps' );
  var merge = require( 'merge-stream' );
  var minify = require( 'gulp-minify-css' );
  var rename = require( 'gulp-rename' );
  var clone = require( 'gulp-clone' );

  var cloneSink = clone.sink();
  return merge.apply( undefined, streams )
    .pipe( sourcemaps.init() )
    .pipe( concat( path.basename( outfile ) ) )
    .pipe( sourcemaps.write() )
    .pipe( cloneSink )
    .pipe(
      minify({
        keepSpecialComments: 0
      })
    )
    .pipe( rename({ extname: '.min.css' }) )
    .pipe( cloneSink.tap() )
    .pipe( gulp.dest( path.dirname( outfile ) ) )
    .on( 'end', done || ( () => {} ) );
};
