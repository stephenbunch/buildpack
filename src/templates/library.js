import { register as registerTestTasks } from '../tools/test';
import { runConcurrent } from '../tools/util';
import { bundle, browserify } from '../tools/browserify';
import { babel } from '../tools/babel';
import { serve as serveKarma } from '../tools/karma';
import { register as registerCommon } from './common';
import { watchGlob } from '../tools/watch';
import { watchify } from '../tools/browserify';

export function register( gulp, options ) {
  var { projectDir, platforms, outfile } = options;
  delete options.projectDir;
  delete options.test;
  delete options.outfile;

  platforms = platforms || [ 'browser', 'node' ];

  const specFiles = `${ projectDir }/test/**/*.spec.js`;
  const sourceFiles = `${ projectDir }/src/**/*`;
  const entryFile = `${ projectDir }/src/index.js`;

  var outFile;
  if ( outfile ) {
    outFile = `${ projectDir }/` + outfile;
  } else {
    outFile = `${ projectDir }/dist/${ options.standalone }.js`;
  }

  var makeJs = done => {
    babel( sourceFiles, `${ projectDir }/lib`, done );
  };

  gulp.task( 'make:js', function( done ) {
    var _ = require( 'lodash' );
    var makeBundle = done => {
      if ( options.standalone ) {
        bundle( browserify( entryFile, options ), outFile, done );
      } else {
        done();
      }
    };
    runConcurrent( [ makeBundle, makeJs ], done );
  });

  gulp.task( 'make', [ 'make:js' ] );

  registerTestTasks( gulp, {
    'all': {
      specs: specFiles,

      // Somehow, running mocha tests first can screw up the karam environment.
      platforms: platforms
    }
  });

  gulp.task( 'default', function( done ) {
    require( 'run-sequence' ).use( gulp )( 'make', 'test', done );
  });

  gulp.task( 'clean:js', function( done ) {
    require( 'del' )( `${ projectDir }/{lib,dist}`, done );
  });

  gulp.task( 'clean', [ 'clean:js' ] );

  gulp.task( 'serve', function( done ) {
    var karma = serveKarma( specFiles, {
      autoWatch: true
    });
    watchGlob( sourceFiles, () => {
      makeJs( karma.reload );
    });
    if ( options.standalone ) {
      watchify( entryFile, outFile, options, karma.reload );
    }
  });

  registerCommon( gulp, projectDir );
};
