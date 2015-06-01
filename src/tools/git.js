export function incrementBuild( packageFile, versionFile, done ) {
  var fs = require( 'fs' );
  var exec = require( 'child_process' ).exec;
  var pkg = require( packageFile );

  var version;
  if ( fileExists( versionFile ) ) {
    version = require( versionFile );
  } else {
    version = {};
  }
  if ( version.version !== pkg.version ) {
    version.version = pkg.version;
    version.build = 0;
  }
  version.build += 1;

  var json = JSON.stringify( version, null, 2 ) + '\n';
  fs.writeFileSync( versionFile, json );

  exec( 'git add ' + versionFile, done );
};

export function tagVersion( versionFile, done ) {
  var exec = require( 'child_process' ).exec;
  var version = require( versionFile );
  var versionString = 'v' + version.version + '-build.' + version.build;
  exec( 'git tag ' + versionString, done );
};

export function updateHooks( repoDir, hooksDir ) {
  var fs = require( 'fs' );

  var installed = fs.readdirSync( repoDir + '/.git/hooks' );
  installed.forEach( function( path ) {
    if ( !/\.sample$/.test( path ) ) {
      fs.unlinkSync( repoDir + '/.git/hooks/' + path );
    }
  });

  var hooks = fs.readdirSync( hooksDir );
  hooks.forEach( function( filename ) {
    var pathToHook = `${ hooksDir }/${ filename }`;
    fs.chmodSync( pathToHook, '0755' );
    fs.symlinkSync( pathToHook, repoDir + '/.git/hooks/' + filename );
  });
};

export function fileExists( path, done ) {
  var fs = require( 'fs' );
  try {
    return fs.statSync( path ).isFile();
  } catch ( err ) {
    return false;
  }
};
