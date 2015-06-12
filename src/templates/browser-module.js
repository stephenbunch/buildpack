import { bundle, browserify } from '../tools/browserify';
import { register as registerCommon } from './common';

export function register( gulp, options ) {
  var { projectDir, entry, outfile } = options;

  delete options.projectDir;
  delete options.entry;
  delete options.outfile;

  options.bundleExternal = false;

  gulp.task( 'make:js', function( done ) {
    bundle(
      browserify( `${ projectDir }/${ entry }`, options ),
      `${ projectDir }/${ outfile }`,
      done
    );
  });

  gulp.task( 'make', [ 'make:js' ] );

  gulp.task( 'default', [ 'make' ] );

  gulp.task( 'clean:js', function( done ) {
    require( 'del' )( `${ projectDir }/${ outfile }`, done );
  });

  gulp.task( 'clean', [ 'clean:js' ] );

  registerCommon( gulp, projectDir );
};
