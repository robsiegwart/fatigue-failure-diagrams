function isZero(val) {
    return val == 0 || val == null;
};

function sortNumber(a, b) {
    return a - b;
};

var chart = Vue.component('fatigue-chart', {
    extends: VueChartJs.Scatter,
    mixins: [VueChartJs.mixins.reactiveProp],
    data() {
        return {
            options: {
                responsive: true,
                height: 400,
                maintainAspectRatio: false,
                scales: {
                    yAxes: [{
                        ticks: {
                            beginAtZero: true,
                        },
                        scaleLabel: {
                            display: true,
                            labelString: 'Alternating Stress',
                            fontSize: 14,
                        }
                    }],
                    xAxes: [{
                        scaleLabel: {
                            display: true,
                            labelString: 'Mean Stress',
                            fontSize: 14,
                        }
                    }]
                },
                legend: {
                    display: true,
                    labels: {
                        fontSize: 16,
                    }
                },
            }
        }
    },
    mounted() {
        this.renderChart(this.chartData, this.options);
    },
});


var app = new Vue({
    el: '#app',
    data: {
        SN: 16e3,
        Sy: 45e3,
        Sut: 60e3,
        Sa: 10e3,
        Sm: 5e3,
        datacollection: null,
        criteria: 'Modified Goodman',
        mathjax_eq: '',
        n: null,
    },
    computed: {
        SN_computed:{ 
            get() { return this.SN },
            set: _.debounce(function(val) { this.SN >= 0 ? this.SN = val : this.SN = 0})
        },
        Sy_computed: { 
            get() { return this.Sy },
            set: _.debounce(function(val) { this.Sy >= 0 ? this.Sy = val : this.Sy = 0})
        },
        Sut_computed: {
            get() { return this.Sut },
            set: _.debounce(function(val) { this.Sut >= 0 ? this.Sut = val : this.Sut = 0})
        },
        Sa_computed: {
            get() { return this.Sa },
            set: _.debounce(function(val) { this.Sa >= 0 ? this.Sa = val : this.Sa = 0})
        },
        Sm_computed: {
            get() { return this.Sm },
            set: _.debounce(function(val) { this.Sm >= 0 ? this.Sm = val : this.Sm = 0})
        },
    },
    methods: {
        plotData(){   // Update the data for the fatigue chart component
            var m = this.Sa/this.Sm;        // slope of load line

            // Create data points for criteria line and intersection point
            var no_points = 50;             // number of points to plot for non-linear lines
            
            switch (this.criteria){
                case 'Modified Goodman':
                    var criteria_label = 'Goodman line';
                    var criteria_data = [{x: this.Sut, y: 0},{x: 0, y: this.SN}];
                    var ll_x_max = Math.min(this.SN/m,this.Sut);
                    this.mathjax_eq = '\\[ \\frac{\\sigma_a}{S_e} + \\frac{\\sigma_m}{S_{ut}} = 1 \\]';
                    var x_int = this.SN/( this.Sa/this.Sm + this.SN/this.Sut );
                    break;
                    
                case 'ASME Elliptic':
                    var criteria_label = 'ASME Elliptic line';
                    var ll_x_max = Math.min(this.SN/m,this.Sy);
                    var criteria_data = [];
                    let last_adder = 0.995;
                    for (var i = 0; i < last_adder*this.Sy; i += this.Sy/no_points ) {
                        criteria_data.push( {x: i, y: this.SN*Math.sqrt(1-(i/this.Sy)**2)} );
                    }
                    criteria_data.push( {x: last_adder*this.Sy, y: this.SN*Math.sqrt(1-(last_adder*this.Sy/this.Sy)**2)} );
                    criteria_data.push( {x: this.Sy, y: this.SN*Math.sqrt(1-(this.Sy/this.Sy)**2)} );
                    this.mathjax_eq = '\\[ \\left(\\frac{\\sigma_a}{S_e}\\right)^2 + \\left(\\frac{\\sigma_m}{S_y}\\right)^2 = 1 \\]';
                    var x_int = Math.sqrt(1/( (this.Sa/(this.SN*this.Sm))**2 + 1/this.Sy**2));
                    break;
                    
                case 'Gerber':
                    var criteria_label = 'Gerber line';
                    var criteria_data = [];
                    for (var i=0; i<=this.Sut; i+=this.Sut/no_points){
                        criteria_data.push({x: i, y: this.SN*(1-(i/this.Sut)**2)})
                    }
                    var ll_x_max = Math.min(this.SN/m,this.Sut);
                    this.mathjax_eq = '\\[ \\frac{\\sigma_a}{S_e} + \\left(\\frac{\\sigma_m}{S_{ut}}\\right)^2 = 1 \\]';
                    let a = 1/this.Sut**2,
                        b = this.Sa/(this.Sm*this.SN),
                        c = -1;
                    var x_int1 = (-b+Math.sqrt(b**2-4*a*c))/(2*a);
                    var x_int2 = (-b-Math.sqrt(b**2-4*a*c))/(2*a);
                    var x_int = x_int1 > 0 ? x_int1 : x_int2;
                    break;
                    
                case 'Soderberg':
                    var criteria_label = 'Soderberg line';
                    var criteria_data = [{x: 0, y: this.SN},{x: this.Sy, y: 0}];
                    var ll_x_max = Math.min(this.SN/m,this.Sy);
                    this.mathjax_eq = '\\[ \\frac{\\sigma_a}{S_e} + \\frac{\\sigma_m}{S_y} = 1 \\]';
                    var x_int = 1/(this.Sa/(this.Sm*this.SN)+1/this.Sy)
                    break;
            }
            
            var int_point = {x: x_int, y: m*x_int };                                     // Intersection point of load line and criteria line
            this.n = Math.hypot(int_point.x,int_point.y)/Math.hypot(this.Sm, this.Sa);   // Factor of safety (ratio of origin to intersection and origin to stress point lengths)
            let ds = [];

            // Stress point
            ds.push({
                label: 'Stress point',
                data: [{x: this.Sm, y: this.Sa }],
                pointRadius: 5,
                borderWidth: 3,
                borderColor: 'red',
                backgroundColor: 'red',
                fill: true,
            });

            // Intersection point
            ds.push({
                label: 'Intersection point',
                data: [{x: int_point.x, y: int_point.y }],
                pointRadius: 4,
                pointBorderWidth: 2,
                borderColor: 'black',
            });

            // Failure line
            ds.push({
                label: criteria_label,
                data: criteria_data,
                lineTension: 0,
                fill: false,
                lineWidth: 2,
                borderColor: 'blue',
                showLine: true,
                pointRadius: 0,
            });
            
            // Load line
            ds.push({
                label: 'Load Line',
                borderColor: 'red',
                showLine: true,
                lineWidth: 2,
                lineTension: 0,
                fill: false,
                data: [{x: 0, y: 0},{x: ll_x_max, y: ll_x_max*m}],
                pointRadius: 0,
            });           

            // Set the datacollection property associated with the plot
            this.datacollection = {
                datasets: ds
            };
        },
    },
    mounted(){
        this.plotData();
    },
    watch: {
        criteria(){
            this.plotData();
            this.$nextTick(function () {
                MathJax.Hub.Typeset()
            });
        },
        SN: _.debounce(function(){ this.plotData(); }, 500),
        Sy: _.debounce(function(){ this.plotData(); }, 500),
        Sut: _.debounce(function(){ this.plotData(); }, 500),
        Sa: _.debounce(function(){ this.plotData(); }, 500),
        Sm: _.debounce(function(){ this.plotData(); }, 500),
    }
});