import { incrementBuild, tagVersion, updateHooks } from '../tools/git';
import { generateSecret } from '../tools/generate';

export function register( gulp, projectDir ) {
  gulp.task( 'git:increment-build', function( done ) {
    incrementBuild( projectDir + '/package.json', projectDir + '/version.json', done );
  });

  gulp.task( 'git:tag-version', function( done ) {
    tagVersion( projectDir + '/version.json', done );
  });

  gulp.task( 'git:update-hooks', function() {
    updateHooks( projectDir, projectDir + '/hooks' );
  });

  gulp.task( 'secret', function( done ) {
    generateSecret( function( err, secret ) {
      if ( err ) {
        return done( err );
      }
      console.log( secret );
      done();
    });
  });
};
