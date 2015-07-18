export function buildEjs( sourceGlob, outdir, opts, done ) {
  if ( typeof opts === 'function' ) {
    done = opts;
    opts = {};
  }

  var gulp = require( 'gulp' );
  var ejs = require( 'gulp-ejs' );

  var stream = gulp.src( sourceGlob ).pipe( ejs( opts && opts.context ) );

  if ( opts ) {
    if ( opts.continueOnError ) {
      stream.on( 'error', err => console.log( err ) );
    }
  }

  stream
    .pipe( gulp.dest( outdir ) )
    .on( 'end', done );
};
