let hiddenValue6 = document.querySelector('#allOrders')
let orders6 = hiddenValue6 ? hiddenValue6.value : null
orders6 = JSON.parse(orders6)

// Set new default font family and font color to mimic Bootstrap's default styling
Chart.defaults.global.defaultFontFamily = 'Nunito', '-apple-system,system-ui,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif';
Chart.defaults.global.defaultFontColor = '#858796';

var hoodie = 0;
var sweater = 0;
var pants = 0;
var polo = 0;
var tshirt = 0;

orders6.forEach(function(order){
  if(order.paymentStatus !== "Failed" && order.paymentStatus !== "Unpaid"){
    order.items.forEach(function(item){
      if(item.title.includes("hoodie")) {
        hoodie += 1
      }
      if(item.title.includes("t-shirt")) {
        tshirt += 1
      }
      if(item.title.includes("polo")) {
        polo += 1
      }
      if(item.title.includes("sweater")) {
        sweater += 1
      }
      if(item.title.includes("pants")) {
        pants += 1
      }
    })
  }
})

// Pie Chart Example
var data = {
    datasets: [{
        data: [
            hoodie,
            sweater,
            pants,
            tshirt,
            polo            
        ],
        backgroundColor: [
            "#FF6384",
            "#4BC0C0",
            "#FFCE56",
            "#E7E9ED",
            "#36A2EB"
        ],
        label: 'My dataset' // for legend
    }],
    labels: [
        "Hoodie",
        "Sweater",
        "Pants",
        "T-Shirt",
        "Polo"
    ]
};
var ctx = $("#myPolarChart");
new Chart(ctx, {
    data: data,
    type: 'polarArea'
});
