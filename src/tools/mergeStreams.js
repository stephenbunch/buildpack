export default function( streams ) {
  var merge = require( 'merge-stream' );
  var countdown = streams.length;
  var result = merge.apply(
    undefined,
    streams.map( stream => {
      return stream.on( 'end', () => {
        // Why are node streams so inconsistent? Why the hell is 'end'
        // not firing on the merge stream?
        if ( --countdown === 0 ) {
          result.emit( 'end' );
        }
      });
    })
  );
  return result;
};
