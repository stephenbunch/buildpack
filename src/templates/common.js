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
    var yargs = require( 'yargs' );
    var args = yargs.default( 'path', 'hooks' ).argv;
    var path = require( 'path' );
    updateHooks( projectDir, path.resolve( projectDir, args.path ) );
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
