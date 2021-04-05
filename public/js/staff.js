//Socket
let socket = io()
//Join
socket.emit('join', 'adminArea')
var table = document.getElementById("order-table");
socket.on('orderPlaced', function(data){
  var total = 0;
  var string = "";
  data.products.forEach(function(item){
    var sub = parseFloat(item.qty * item.price)
    total += sub
    string = string.concat("<p>" + item.title + " (" + item.size + ") " + " - "  + item.qty + "</p>")
  })
  var row = table.insertRow(1);
  var cell1 = row.insertCell(0);
  var cell2 = row.insertCell(1);
  var cell3 = row.insertCell(2);
  var cell4 = row.insertCell(3);
  var cell5 = row.insertCell(4);
  var cell6 = row.insertCell(5);
  var cell7 = row.insertCell(6);
  cell1.innerHTML = "<p>" + data._id + "</p>" +
                    string +
                    "<b>Total: " +  total.toLocaleString('en-US', {style: 'currency', currency: 'VND'}) + "</b>";
  cell2.innerHTML = "<p>" + data.buyerName + "</p>" + "<p>" + data.buyerPhone + "</p>" + "<p>" + data.buyerEmail + "</p>";
  cell3.innerHTML = "<p>" + data.buyerAddress + "</p>";
  if(data.paymentType === "Momo Wallet"){
    cell4.innerHTML = "<p>" + data.paymentStatus + "</p>";
  }
  if(data.paymentType === "Paypal"){
    cell4.innerHTML = "<p>" + data.paymentStatus + "</p>";
  }
  if(data.paymentType === "Cash on Delivery"){
    cell4.innerHTML = "<form action='/staff/orders/paymentStatus' method='post'>" +
      '<input type="hidden" name="orderId" value=' + data._id + '>'+
      '<select name="paymentStatus" onchange="this.form.submit()">'+
        '<option value="Unpaid" data.paymentStatus === "Unpaid" ? "selected" : "" > Unpaid</option>'+
        '<option value="Paid" data.paymentStatus === "Paid" ? "selected" : ""> Paid</option>'+
        '<option value="Failed" data.paymentStatus === "Failed" ? "selected" : ""> Failed</option>'+
      '</select>'+
      "</form>"
  }
  cell5.innerHTML = '<form action="/staff/orders/deliveryStatus" method="post">' +
    '<input type="hidden" name="orderId" value=' + data._id + '>'+
    '<select name="deliveryStatus" onchange="this.form.submit()">' +
      '<option value="Order_placed" order.deliveryStatus === "order-placed" ? "selected" : "" > Placed</option>' +
      '<option value="Confirmed" order.deliveryStatus === "Confirmed" ? "selected" : "" > Confirmed</option>' +
      '<option value="Delivering" order.deliveryStatus === "Delivering" ? "selected" : "" > Delivering</option>' +
      '<option value="Completed" order.deliveryStatus === "Completed" ? "selected" : "" > Completed</option>' +
      '<option value="Cancelled Order" order.deliveryStatus === "Cancelled Order" ? "selected" : "" > Cancelled Order</option>' +
    '</select>' +
  '</form>'
  cell6.innerHTML = "<p>" + data.paymentType + "</p>";
  cell7.innerHTML = "<p>" + moment(data.createdAt).format('MMMM Do YYYY, hh:mm  A') + "</p>";
});

socket.on('orderFailed', function(data){
  table.rows[1].cells[3].innerHTML = data.paymentStatus;
  table.rows[1].cells[4].innerHTML = data.deliveryStatus;
});

socket.on('orderSuccess',function(data){
  table.rows[1].cells[3].innerHTML = data.paymentStatus;
});


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

//Count words when writing product description
$("#word_count").on('keyup', function() {
    var words = 0;

    if ((this.value.match(/\S+/g)) != null) {
      words = this.value.match(/\S+/g).length;
    }

    if (words > 53) {
      // Split the string on first 200 words and rejoin on spaces
      var trimmed = $(this).val().split(/\s+/, 53).join(" ");
      // Add a space at the end to make sure more typing creates new words
      $(this).val(trimmed + " ");
    }
    else {
      $('#display_count').text(words);
      $('#word_left').text(53-words);
    }
  });

//Remove all the words that exceed the allowed word limit
  $("#editCounter").on('keyup', function() {
      var words = 0;

      if ((this.value.match(/\S+/g)) != null) {
        words = this.value.match(/\S+/g).length;
      }

      if (words > 53) {
        // Split the string on first 200 words and rejoin on spaces
        var trimmed = $(this).val().split(/\s+/, 53).join(" ");
        // Add a space at the end to make sure more typing creates new words
        $(this).val(trimmed + " ");
      }
      else {
        $('#display_count2').text(words);
        $('#word_left2').text(53-words);
      }
    });



//Dropzone configuration
Dropzone.options.dropzoneForm = {
  acceptedFiles: 'image/*',
  maxFiles: 3,
  init: function(){
    this.on("addedfile", function(file){
      if(document.getElementById('gallery').getElementsByTagName('li').length === 4){
        this.removeFile(file)
      }
      else if(document.getElementById('gallery').getElementsByTagName('li').length === 3 && this.files.length === 2){
        this.removeFile(file)
      }
      else if(document.getElementById('gallery').getElementsByTagName('li').length === 2 && this.files.length === 3){
        this.removeFile(file)
      }
      else if(document.getElementById('gallery').getElementsByTagName('li').length === 1 && this.files.length === 4){
        this.removeFile(file)
      }
      else if(document.getElementById('gallery').getElementsByTagName('li').length === 0 && this.files.length === 5){
        this.removeFile(file)
      }
      $(".uploadBtn").click(function(){
        location.reload();
      })
    })
  }
}
