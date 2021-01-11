//Set active link on the navigation panel
$(document).ready(function() {
  $('li.active').removeClass('active');
  $('a[href="' + location.pathname + '"]').closest('li').addClass('active');
});

//Setting file reader function to obtain image from computer
function readURL(input){
  if (input.files && input.files[0]){
    var reader = new FileReader();
    reader.onload = function(e){
      $("#imgPreview").attr('src', e.target.result).width(100).height(100);
    }

    reader.readAsDataURL(input.files[0]);
  }
}

$("#img").change(function(){
  readURL(this);
})

//Dropzone configuration
Dropzone.options.dropzoneForm = {
  acceptedFiles: 'image/*',
  init: function(){
    this.on("queuecomplete", function(file){
      setTimeout(function(){
        location.reload()
      }, 1000);
    })
  }
}
