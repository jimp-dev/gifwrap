
const { Gif, GifUtil } = require('./');
GifUtil.read("test/fixtures/nburling-public.gif").then(gif => {

    console.log("successfully read");
    gif.colorScope = Gif.GlobalColorsOnly;
    return GifUtil.write("pass-thru.gif", gif.frames, gif).then(outputGif => {

        console.log("successfully written");
        return GifUtil.read("pass-thru.gif").then(gif => {

            console.log("successfully read back");
        });
    });
})
.catch(err => {
    console.log(err);
});
