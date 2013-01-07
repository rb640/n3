(function() {

var n3 = window.n3 || {};
window.n3 = n3;
n3.__namespace = true;

(function ($self, undefined) {

    $self.version = "0.1.1";
    $self.debug = false;
    $self.dispatch = d3.dispatch('render_start', 'render_end', 'update_graphs');

    /**
     * Stores all log variables and stats.
     */

    $self.logs = {};
    
    /**
     * Stores all rendered graphs.
     */

    $self.graphs = [];

    /**
     * Logs the arguments to the console.log output.
     */

    $self.log = function () {
        if ($self.debug && console.log && console.log.apply) {
            console.log.apply(console, arguments);
        }
        else if ($self.debug && console.log && Function.prototype.bind) {
            var log = Function.prototype.bind.call(console.log, console);
            log.apply(console, arguments);
        }
        return arguments[arguments.length - 1];
    };

    /**
     * Performs the render steps so that all callbacks get executed within a 
     * dispatch render start/end before rendering the next callback function.
     *
     * @param {Number} step: The number of items to generate in each timeout loop
     */

    $self.render = function render(step) {
        step = step || 1; // number of items to generate in each timeout loop

        render.active = true;
        $self.dispatch.render_start();

        setTimeout(function () {
            var chart, graph;

            for (var i = 0; i < step && (graph = render.queue[i]); i++) {
                chart = graph.generate();
                $self.graphs.push(chart);
            }

            render.queue.splice(0, i);

            if (render.queue.length) setTimeout(arguments.callee, 0);
            else { $self.render.active = false; $self.dispatch.render_end(); }
        }, 0);
    };

    $self.render.active = false;
    $self.render.queue = [];

    /**
     * Queues a given object function for the callback render function.
     *
     * @param {Object} obj: A function queued in the render callback loop.
     */

    $self.addGraph = function (obj) {
        if (typeof arguments[0] == typeof(Function))
            obj = { generate: arguments[0] };

        $self.render.queue.push(obj);

        if (!$self.render.active) $self.render();
    };

    /**
     * Rebinds the window.onresize event to allow for extended callbacks.
     *
     * @param {Function} fun: The function to callback on window resize.
     */

    $self.windowResize = function (fun) {
        var _onresize = window.onresize;
        window.onresize = function (e) {
            if (typeof _onresize == 'function') _onresize(e);
            fun(e);
        };
    };

    /**
     * Initializes the dispatch render_start and render_end callback loops
     * used primarily by the render queue. This will only occur if in debug.
     */

    function init() {
        if ($self.debug) {
            $self.dispatch.on('render_start', function (e) {
                $self.logs.startTime = +new Date();
            });
            $self.dispatch.on('render_end', function (e) {
                $self.logs.endTime = +new Date();
                $self.logs.totalTime = $self.logs.endTime - $self.logs.startTime;
                $self.log('total', $self.logs.totalTime, 'ms');
            });
        }

        $self.dispatch.on('update_graphs', function (e) {
            for (var i = 0; i < $self.graphs.length; i++) {
                $self.graphs[i].container.call($self.graphs[i]);
            };
        });

        $self.windowResize(function () {
            $self.dispatch.update_graphs();
        });
    }

    init();

}(n3));

n3 = window.n3 || {};
n3.__namespace = true;

n3.graphing = n3.graphing || {};
n3.graphing.__namespace = true;

(function ($self, undefined) {

    $self.linegraph = function () {

        var width = null;
        var height = null;
        var margin = { top: 0, right: 0, bottom: 0, left: 0 };
        var ticks = 7;
        var subdivide = true;
        var xAxis = d3.svg.axis();
        var yAxis = d3.svg.axis();
        var x = null;
        var y = null;
        var background = "#222";
        var hideXAxis = false;
        var hideYAxis = false;
        var tickSubdivide = true;
        var xScale = d3.time.scale();
        var yScale = d3.scale.linear();
        var xDomain = null;
        var yDomain = null;
        
        var color = function () {
            var colors = d3.scale.category20c().range();
            return function(d, i) { return d.color || colors[i % colors.length] };
        }();

        function chart(selection) {
            // each selection should contain a data model
            selection.each(function (data) {
                var container = d3.select(this);
                var self = this;

                var totalWidth = (width || parseInt(container.style("width")) || 960);
                var totalHeight = (height || parseInt(container.style("height")) || 400);
                var availableWidth = totalWidth - margin.left - margin.right;
                var availableHeight = totalHeight - margin.top - margin.bottom;

                chart.container = container;

                // Initialize scales
                if (!xDomain) {
                    xDomain = [d3.min(data, function (d) { return d3.min(d.values, function (dv) { return dv.x; }); }), 
                               d3.max(data, function (d) { return d3.max(d.values, function (dv) { return dv.x; }); })];
                }
                if (!yDomain) {
                    yDomain = [0,d3.max(data, function (d) { return d3.max(d.values, function (dv) { return dv.y; }); })];
                    yDomain[1] = yDomain[1] * 1.25;
                }
                x = xScale.range([0, availableWidth]).domain(xDomain);
                y = yScale.range([availableHeight, 0]).domain(yDomain);

                // Add the optional background
                if (background) {
                    if (container.selectAll(".n3-background")[0].length == 0) {
                        container.append("rect").attr("class", "n3-background").attr("fill", background)
                                             .attr("width", availableWidth).attr("height",availableHeight);
                    }
                    d3.transition(container.select(".n3-background")).attr("fill", background)
                                                             .attr("width", availableWidth)
                                                             .attr("height", availableHeight);
                }

                // Add the axis
                if (!hideXAxis) {
                    xAxis.scale(x).ticks(ticks).tickSize(availableHeight).tickSubdivide(tickSubdivide).orient("bottom");
                    if (container.selectAll(".n3-x.n3-axis")[0].length == 0) {
                        container.append("g").attr("class", "n3-x n3-axis")
                                          .attr("transform", "translate(0," + "-20)")
                                          .call(xAxis);
                    }
                    d3.transition(container.select(".n3-x.n3-axis")).call(xAxis);
                }
                if (!hideYAxis) {
                    yAxis.scale(y).ticks(4).tickSize(availableWidth).orient("right");
                    if (container.selectAll(".n3-y.n3-axis")[0].length == 0) {
                        container.append("g").attr("class", "n3-y n3-axis")
                                          .attr("transform", "translate(-5,0)")
                                          .call(yAxis);
                    }
                    d3.transition(container.select(".n3-y.n3-axis")).call(yAxis);
                }


                // Setup container skeleton
                var wrap = container.selectAll("g.n3-wrap.n3-linegraph").data(data);
                var gEnter = wrap.enter().append("g").attr("class", "n3 n3-wrap n3-linegraph").append("g");
                var g = wrap.select("g");

                // Add the clip path
                gEnter.append("clipPath").append("rect").attr("class", "n3-clip").attr("width", availableWidth)
                                                        .attr("height", availableHeight);
                gEnter.select("n3-clip").attr("width", availableWidth).attr("height", availableHeight);

                // Add gradients for all data models
                var gradientEnter = gEnter.append("defs").append("linearGradient")
                                                         .attr("id", function (d, i) { return "gradient_" + i + "_" + d.key || "y" })
                                                         .attr("x1", "0%").attr("y1", "0%").attr("x2", "0%").attr("y2", "100%")
                                                         .attr("spreadMethod", "pad");
                gradientEnter.append("stop").attr("offset", "0%")
                                            .style("stop-opacity", "0.5")
                                            .style("stop-color", function (d, i) { return d.color || color(d, i); })
                                            .attr("class", "n3-gradient-start");
                gradientEnter.append("stop").attr("offset", "100%")
                                            .style("stop-opacity", "0.3")
                                            .style("stop-color", function (d, i) { return d.color || color(d, i); })
                                            .attr("class", "n3-gradient-stop");

                // Add area paths for all data models
                var pathsEnter = gEnter.append("g").attr("class", "n3-paths");

                // Append data paths for area
                pathsEnter.append("path").attr("class", "n3-area")
                                         .attr("fill", function (d, i) { return "url(#gradient_" + i + "_" + (d.key || "y") + ")" })
                                         .attr("d", function (d, i) { 
                                             var area = d3.svg.area().x(function (d) { return x(d.x); })
                                                              .y0(availableHeight)
                                                              .y1(function (d) { return y(d.y); });
                                             return area(d.values);
                                         });

                // Append data paths for strokes
                pathsEnter.append("path").attr("class", "n3-stroke")
                                         .attr("fill", "transparent")
                                         .attr("stroke", function (d, i) { return d.color || color(d, i); })
                                         .attr("d", function (d, i) {
                                             var line = d3.svg.line().x(function (d) { return x(d.x); })
                                                                     .y(function (d) { return y(d.y); });
                                             return line(d.values);
                                         });

                g.select(".n3-area").attr("d", function (d, i) { 
                                     var area = d3.svg.area().x(function (d) { return x(d.x); })
                                                      .y0(availableHeight)
                                                      .y1(function (d) { return y(d.y); });
                                     return area(d.values);
                                 });
                g.select(".n3-stroke").attr("d", function (d, i) {
                                        var line = d3.svg.line().x(function (d) { return x(d.x); })
                                                                .y(function (d) { return y(d.y); });
                                        return line(d.values);
                                    });
            });
        };

        chart.background = function (_) {
            if (!arguments.length) return background;
            background = _;
            return chart;
        }

        chart.margin = function (_) {
            if (!arguments.length) return margin;
            margin.top = typeof _.top != 'undefined' ? _.top : margin.top;
            margin.right = typeof _.right != 'undefined' ? _.right : margin.right;
            margin.bottom = typeof _.bottom != 'undefined' ? _.bottom: margin.bottom;
            margin.left = typeof _.left != 'undefined' ? _.left : margin.left;
            return chart;
        };

        chart.width = function (_) {
            if (!arguments.length) return width;
            width = _;
            return chart;
        };

        chart.height = function (_) {
            if (!arguments.length) return height;
            height = _;
            return chart;
        }

        chart.hideXAxis = function (_) {
            if (!arguments.length) return hideXAxis;
            hideXAxis = _;
            return chart;
        };

        chart.hideYAxis = function (_) { 
            if (!arguments.length) return hideYAxis;
            hideYAxis = _;
            return chart;
        };

        chart.xScale = function (_) {
            if (!arguments.length) return xScale;
            xScale = _;
            return chart;
        };

        chart.yScale = function (_) {
            if (!arguments.length) return yScale;
            yScale = _;
            return chart;
        };

        chart.xDomain = function (_) {
            if (!arguments.length) return xDomain;
            xDomain = _;
            return chart;
        };

        chart.yDomain = function (_) {
            if (!arguments.length) return yDomain;
            yDomain = _;
            return chart;
        };

        return chart;

    };
    $self.linegraph.__class = true;

}(n3.graphing));
})();