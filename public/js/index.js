let hiddenValue = document.querySelector('#hiddenValue')
let order = hiddenValue ? hiddenValue.value : null
order = JSON.parse(order)
//Socket
let socket = io()
//Join
if(order){
  socket.emit('join', 'order_' + order._id)
}

socket.on('orderUpdated', function(data){
  // updatedOrder.updatedAt = moment().format()
  if(data.paymentStatus === ""){

  }
  else if(data.paymentStatus === "Unpaid"){
    $(".paid").removeClass("paid").addClass("unpaid")
  }
  else if(data.paymentStatus === "Paid"){
    $(".unpaid").removeClass("unpaid").addClass("paid")
  }
  $("#trackingStatus").html(data.deliveryStatus);
  $(".paymentStatus").html(data.paymentStatus);
});


//Show More
$(".moreBox").slice(0, 3).show();
if ($(".col-4:hidden").length != 0) {
  $("#showMore").show();
}
$("#showMore").on('click', function(e) {
  e.preventDefault();
  $(".moreBox:hidden").slice(0, 4).fadeIn();
  if ($(".moreBox:hidden").length == 0) {
    $("#showMore").hide();
  }
});

// Sticky Navigation
let navbar = $(".navbar");
let navItem = $(".navbar-brand, .nav-link, .nav-item i");

$(window).scroll(function() {
  let oTop = $(".searchBar").offset().top;
  if ($(window).scrollTop() > oTop) {
    navbar.addClass("sticky");
    navItem.addClass("sticky-text");
  } else {
    navbar.removeClass("sticky");
    navItem.removeClass("sticky-text");
  }
});

//Clear cart in checkout session
$(function() {
  $('.clearcart').on('click', function() {
    if (!confirm('Confirm Clear Cart'))
      return false;
  });
});

//Script to validate the checkout form
// Example starter JavaScript for disabling form submissions if there are invalid fields
(function() {
  'use strict'

  window.addEventListener('load', function() {
    // Fetch all the forms we want to apply custom Bootstrap validation styles to
    var forms = document.getElementsByClassName('needs-validation')

    // Loop over them and prevent submission
    Array.prototype.filter.call(forms, function(form) {
      form.addEventListener('submit', function(event) {
        if (form.checkValidity() === false) {
          event.preventDefault()
          event.stopPropagation()
        }

        form.classList.add('was-validated')
      }, false)
    })
  }, false)
})()

//Script to switch between payment methods
/* by default hide all radio_content div elements except first element */
$(".radio-content .content").hide();
$(".radio-content .content:first-child").show();

/* when any radio element is clicked, Get the attribute value of that clicked radio element and show the radio_content div element which matches the attribute value and hide the remaining tab content div elements */
$(".custom-control-input").click(function() {
  var current_radio = $(this).attr("id");
  $(".radio-content .content").hide();
  $("." + current_radio).show();
})

//Script to zoom in product image
$(function() {
  $("#productImg").imagezoomsl();
});


// //Set initial value for select option
if (localStorage.getItem('sortOptions')) {
  $('#sortOptions').val(localStorage.getItem('sortOptions'));
}

if (localStorage.getItem('sortOptionsByCat')) {
  $('#sortOptionsByCat').val(localStorage.getItem('sortOptionsByCat'));
}else{
  document.getElementById("sortOptionsByCat").selectedIndex = "0";
}



function resetSortByCategory() {
  localStorage.removeItem('sortOptionsByCat');
}

function resetSort() {
  localStorage.setItem('sortOptions', "http://localhost:3000/products");
}

//Script for Sorting
function la(src) {
  localStorage.setItem('sortOptions', $('#sortOptions').val());
  window.location.href = src;
}

function laByCat(src) {
  localStorage.setItem('sortOptionsByCat', $('#sortOptionsByCat').val());
  window.location.href = src;

}





// function removePageParameter(){
//   const params = new URLSearchParams(window.location.search);
//
//   params.delete('page')
//   window.location.href = window.location.pathname + params;
//
// }

//Script for Stripe
var stripe = Stripe('pk_test_51I80A2LgwNf2Pwu03zARTAY0GWcxdLq2eN9TO5DmXjiBZYYbRqZ5jfycbwHj0rkcclusxinKpB6NBMGQzMlZTqop00J8FPxIR2');

// Create an instance of Elements.
var elements = stripe.elements();

// Custom styling can be passed to options when creating an Element.
// (Note that this demo uses a wider set of styles than the guide below.)
var style = {
  base: {
    color: '#32325d',
    fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
    fontSmoothing: 'antialiased',
    fontSize: '16px',
    '::placeholder': {
      color: '#aab7c4'
    }
  },
  invalid: {
    color: 'red',
    iconColor: '#fa755a'
  }
};

// Create an instance of the card Element.
var card = elements.create('card', {
  style: style
});

// Add an instance of the card Element into the `card-element` <div>.
card.mount('#card-element');

card.on('change', ({
  error
}) => {
  let displayError = document.getElementById('card-errors');
  if (error) {
    displayError.textContent = error.message;
  } else {
    displayError.textContent = '';
  }
});

// Handle form submission.
var form = document.getElementById('payment-form');
form.addEventListener('submit', function(event) {
  event.preventDefault();

  stripe.createToken(card).then(function(result) {
    if (result.error) {
      // Inform the user if there was an error.
      var errorElement = document.getElementById('card-errors');
      errorElement.textContent = result.error.message;
    } else {
      // Send the token to your server.
      stripeTokenHandler(result.token);
    }
  });
});

// Submit the form with the token ID.
function stripeTokenHandler(token) {
  // Insert the token ID into the form so it gets submitted to the server
  var form = document.getElementById('payment-form');
  var hiddenInput = document.createElement('input');
  hiddenInput.setAttribute('type', 'hidden');
  hiddenInput.setAttribute('name', 'stripeToken');
  hiddenInput.setAttribute('value', token.id);
  form.appendChild(hiddenInput);

  // Submit the form
  form.submit();
}







//
// $(window).on('resize', function() {
//     if($(window).width() < 430) {
//         $('.single-product .mobile-version').removeClass('col-6');
//         $('.single-product .mobile-version').addClass('col-12');
//     }
//     else{
//         $('.single-product .mobile-version').removeClass('col-12');
//         $('.single-product .mobile-version').addClass('col-6');
//     }
// });




// $(window).resize(function)
// const size = window.matchMedia( "(max-width: 425px)" );
// if (size.matches) {
//     for (var i = 0; i < document.querySelectorAll("h4").length; i++) {
//       var temp = document.querySelectorAll("h4")[i].innerHTML;
//       if(temp.length > 13){
//         document.querySelectorAll("h4")[i].innerHTML = temp.substring(0,14) + "...";
//       }
//   }
// }
// else {
//
// }
