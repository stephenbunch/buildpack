import { register as registerTestTasks } from '../tools/test';
import { runConcurrent } from '../tools/util';
import { bundle, browserify } from '../tools/browserify';
import { babel } from '../tools/babel';
import { serve as serveKarma } from '../tools/karma';
import { register as registerCommon } from './common';

export function register( gulp, { projectDir, name } ) {
  const specFiles = `${ projectDir }/test/**/*.spec.js`;

  gulp.task( 'make:js', function( done ) {
    var makeBundle = done => {
      bundle(
        browserify( `${ projectDir }/src/index.js`, {
          standalone: name
        }),
        `${ projectDir }/dist/${ name }.js`,
        done
      );
    };
    var makeJs = done => {
      babel( `${ projectDir }/src/**/*`, `${ projectDir }/lib`, done );
    };
    runConcurrent( [ makeBundle, makeJs ], done );
  });

  gulp.task( 'make', [ 'make:js' ] );

  registerTestTasks( gulp, {
    'all': {
      specs: specFiles,

      // Somehow, running mocha tests first can screw up the karam environment.
      platforms: [ 'browser', 'node' ]
    }
  });

  gulp.task( 'default', function( done ) {
    require( 'run-sequence' ).use( gulp )( 'make', 'test', done );
  });

  gulp.task( 'clean:js', function( done ) {
    require( 'del' )( `${ projectDir }/{lib,dist}`, done );
  });

  gulp.task( 'clean', [ 'clean:js' ] );

  gulp.task( 'serve', function() {
    serveKarma( specFiles );
  });

  registerCommon( gulp, projectDir );
};
