/*
 *  Power BI Visual CLI
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved.
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ''Software''), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

module powerbi.extensibility.visual {
    import ISelectionId = powerbi.visuals.ISelectionId;
    import valueFormatter = powerbi.extensibility.utils.formatting.valueFormatter;
    import TextProperties = powerbi.extensibility.utils.formatting.TextProperties;
    import textMeasurementService = powerbi.extensibility.utils.formatting.textMeasurementService;
    import axis = powerbi.extensibility.utils.chart.axis;
    import ILegend = powerbi.extensibility.utils.chart.legend.ILegend;
    import LegendPosition = powerbi.extensibility.utils.chart.legend.LegendPosition;
    import tooltip = powerbi.extensibility.utils.tooltip;
    import ITooltipServiceWrapper = powerbi.extensibility.utils.tooltip.ITooltipServiceWrapper;
    import createTooltipServiceWrapper = powerbi.extensibility.utils.tooltip.createTooltipServiceWrapper;

    export interface TooltipEventArgs<TData> {
        data: TData;
        coordinates: number[];
        elementCoordinates: number[];
        context: HTMLElement;
        isTouchEvent: boolean;
    }

    export class Visual implements IVisual {
        public static margins: {
            bottom: number;
            left: number;
            right: number;
            top: number;
        } = {
                bottom: 30,
                left: 40,
                right: 0,
                top: 0
            };
        public static isGradientPresent: boolean;
        public static isColorCategoryPresent: boolean;
        public static legendDataPoints: ILegendDataPoint[];
        public static xParentPresent: boolean;
        public static catGroupPresent: boolean;
        public static catSizePresent: boolean;
        public static legend: ILegend;
        public static dataValues: number[];
        public static xTitleText: string;
        public static yTitleText: string;
        public static legendTitle: string;
        public host: IVisualHost;
        private target: HTMLElement;
        private legendDotSvg: d3.Selection<SVGElement>;
        private selectionManager: ISelectionManager;
        private viewport: IViewport;
        private colorPalette: IColorPalette;
        private xAxis: d3.Selection<SVGElement>;
        private xParentAxis: d3.Selection<SVGElement>;
        private yAxis: d3.Selection<SVGElement>;
        private yParentAxis: d3.Selection<SVGElement>;
        private xTitle: d3.Selection<SVGElement>;
        private yTitle: d3.Selection<SVGElement>;
        private svg: d3.Selection<SVGElement>;
        private selectionIdBuilder: ISelectionIdBuilder;
        private data: IBoxWhiskerDataPoints;
        private boxArray: IBoxDataPoints[];
        private dataView: DataView;
        private events: IVisualEventService;
        private tooltipServiceWrapper: ITooltipServiceWrapper;
        private legendDotTitle: string;
        private measureFormat: string;
        private sizeFormat: string;
        private categoryColorData: any;
        private baseContainer: d3.Selection<SVGElement>;
        private scrollableContainer: d3.Selection<SVGElement>;
        private yAxisSvg: d3.Selection<SVGElement>;
        private xAxisSvg: d3.Selection<SVGElement>;
        private dotsContainer: d3.Selection<SVGElement>;
        private svgGridLines: d3.Selection<SVGElement>;
        private xParentAxisSvg: d3.Selection<SVGElement>;
        private yParentAxisSvg: d3.Selection<SVGElement>;
        private catLongestText: string;
        private xParentLongestText: string;
        private axisGridLines: d3.Selection<SVGElement>;
        private bgParentAxis: d3.Selection<SVGElement>;
        private lastValue: boolean;
        private newValue: boolean;
        private isChanged: boolean;
        private flipSetting: IFlipSettings;
        private yAxisConfig: IAxisSettings;
        private xAxisConfig: IAxisSettings;
        private rangeConfig: IRangeSettings;
        private legendSetting: ILegendConfig;
        private parentAxisConfigs: IParentAxisSettings;
        private gradientSetting: IGradientSelectorSettings;
        private backgroundSetting: IBackgroundSettings;
        private gridLinesSetting: IGridLinesSettings;
        private tickSetting: ITickSettings;
        private boxOptionsSetting: IBoxOptionsSettings;
        private meanSetting: IMeanSettings;
        private sortSetting: ISortSettings;
        private highlight: boolean;
        private clickFlag: boolean;
        private color: string[];
        private dotSelection: d3.Selection<IBoxWhiskerViewModel>;
        private legendSelection: d3.Selection<any>;

        constructor(options: VisualConstructorOptions) {
            this.host = options.host;
            this.selectionManager = options.host.createSelectionManager();
            this.selectionManager.registerOnSelectCallback(() => {
                this.dotSelection = d3.selectAll('.boxWhisker_dot');
                this.legendSelection = d3.selectAll('.legendItem');

            });
            this.events = options.host.eventService;
            this.selectionIdBuilder = options.host.createSelectionIdBuilder();
            this.tooltipServiceWrapper = createTooltipServiceWrapper(this.host.tooltipService, options.element);
            Visual.legend = powerbi.extensibility.utils.chart.legend.createLegend(
                jQuery(options.element),
                false,
                null,
                true);
            this.target = options.element;
            this.legendDotSvg = d3.select(this.target)
                .append('svg');
            this.baseContainer = d3.select(options.element)
                .append('div')
                .classed('boxWhisker_baseContainer', true);

            this.scrollableContainer = this.baseContainer
                .append('div')
                .classed('boxWhisker_scrollableContainer', true);

            this.svg = this.scrollableContainer
                .append('svg')
                .classed('boxWhisker_dotChart', true);

            this.bgParentAxis = this.svg
                .append('g')
                .classed('boxWhisker_bgParentAxis', true);

            this.svgGridLines = this.svg
                .append('g')
                .classed('boxWhisker_svgGridLines', true);

            this.axisGridLines = this.svg
                .append('g')
                .classed('boxWhisker_axisGridLines', true);

            this.dotsContainer = this.svg.append('g')
                .classed('boxWhisker_dotsContainer', true);

            Visual.catSizePresent = false;
            Visual.xParentPresent = false;
            Visual.catGroupPresent = false;
            this.measureFormat = '';
            this.sizeFormat = '';
            this.xParentLongestText = '';
            this.lastValue = null;
            this.isChanged = false;
            this.color = [];
        }

        public updateDatapoints(dataPoint) {
            dataPoint = {
                category: '',
                categoryColor: 'red',
                categoryGroup: '',
                categorySize: 1,
                selectionId: null,
                tooltipData: [],
                value: 0,
                xCategoryParent: '',
                updatedXCategoryParent: '',
                highlights: null,
                key: null
            };
            return dataPoint;
        }

        public transformHelper(data, boxWhiskerdataPoints, dataPoint, formatter, i) {
            if (data.source.roles.hasOwnProperty('categoryGroup')) {
                if (data.source.displayName !== name) {
                    boxWhiskerdataPoints.xTitleText = data.source.displayName;
                    if (data.source.type.dateTime) {
                        dataPoint.categoryGroup = formatter.format(new Date(data.values[i].toString()));
                    } else {
                        dataPoint.categoryGroup = formatter.format(data.values[i]);
                    }
                    Visual.catGroupPresent = true;
                }
            }
        }

        public visualTransformHelper(groups, iterator, dataPoint, host, dataView, boxWhiskerdataPoints, boxAndWhiskerHelperArray, currentCat,
            currentXParent, catMaxLen, xParentMaxLen) {
            groups.forEach((group: DataViewValueColumnGroup) => {
                for (iterator = 0; iterator < group.values[0].values.length; iterator++) {
                    if (group.values[0].values[iterator] !== null) {
                        dataPoint = this.updateDatapoints(dataPoint);
                        const selectionId: visuals.ISelectionId = host.createSelectionIdBuilder()
                            .withCategory(dataView.categorical.categories[0], iterator)
                            .withSeries(dataView.categorical.values, group)
                            .createSelectionId();
                        for (let k: number = 0; k < group.values.length; k++) {
                            if (group.values[k].source.roles.hasOwnProperty('measure')) {
                                boxAndWhiskerHelperArray[2] = k;
                                boxWhiskerdataPoints.yTitleText = group.values[k].source.displayName;
                                dataPoint.value = (Number(group.values[k].values[iterator]));
                                dataPoint.highlights = group.values[k].highlights ? group.values[k].highlights[iterator] : null;
                                this.measureFormat = group.values[k].source.format;
                            }
                            if (group.values[k].source.roles.hasOwnProperty('categorySize')) {
                                this.legendDotTitle = group.values[k].source.displayName;
                                Visual.catSizePresent = true;
                                this.sizeFormat = group.values[k].source.format;
                                dataPoint.categorySize = (Number(group.values[k].values[iterator]));
                            }
                            if (group.values[k].source.roles.hasOwnProperty('categoryColor')) {
                                Visual.isGradientPresent = true;
                                dataPoint.categoryColor = boxWhiskerUtils.convertToString(group.values[k].values[iterator]);
                                this.categoryColorData.push(group.values[k].values[iterator]);
                            }
                            const formatter0: utils.formatting.IValueFormatter = valueFormatter.create({
                                format: group.values[k].source.format ? group.values[k].source.format : valueFormatter.DefaultNumericFormat
                            });
                            const tooltipDataPoint: ITooltipDataPoints = {
                                name: group.values[k].source.displayName,
                                value: formatter0.format(parseFloat(boxWhiskerUtils.convertToString(group.values[k].values[iterator])))
                            };
                            dataPoint.tooltipData.push(tooltipDataPoint);
                        }
                        this.highlight = dataView.categorical.values[0].highlights ? true : false;
                        for (let cat1: number = 0; cat1 < dataView.categorical.categories.length; cat1++) {
                            boxAndWhiskerHelperArray[0] = valueFormatter.create({
                                format: dataView.categorical.categories[cat1].source.format
                            });
                            const data: any = dataView.categorical.categories[cat1];
                            if (data.source.roles.hasOwnProperty('category')) {
                                dataPoint.category = boxAndWhiskerHelperArray[0].format(data.values[iterator]);
                            }
                            this.transformHelper(data, boxWhiskerdataPoints, dataPoint, boxAndWhiskerHelperArray[0], iterator);
                            if (data.source.roles.hasOwnProperty('xCategoryParent')) {
                                boxAndWhiskerHelperArray[1] = data.source.displayName;
                                boxAndWhiskerHelperArray[3] = cat1;
                                if (data.source.type.dateTime) {
                                    dataPoint.xCategoryParent = boxAndWhiskerHelperArray[0].format(new Date(data.values[iterator].toString()));
                                } else {
                                    dataPoint.xCategoryParent = boxAndWhiskerHelperArray[0].format(data.values[iterator]);
                                }
                                Visual.xParentPresent = true;
                            }
                            const tooltipDataPoint: ITooltipDataPoints = {
                                name: data.source.displayName,
                                value: boxAndWhiskerHelperArray[0].format(data.values[iterator])
                            };
                            if (JSON.stringify(dataPoint.tooltipData).indexOf(JSON.stringify(tooltipDataPoint)) < 0) {
                                dataPoint.tooltipData.push(tooltipDataPoint);
                            }
                        }
                        for (const k of dataView.metadata.columns) {
                            if (k.roles.hasOwnProperty('categoryColor') && !Visual.isGradientPresent) {
                                dataPoint.categoryColor = boxWhiskerUtils.convertToString(group.name);
                                Visual.legendTitle = k.displayName;
                                Visual.isColorCategoryPresent = true;
                                const tooltipDataPoint: ITooltipDataPoints = {
                                    name: k.displayName,
                                    value: boxWhiskerUtils.convertToString(group.name)
                                };
                                dataPoint.tooltipData.push(tooltipDataPoint);
                                break;
                            }
                        }
                        if (Visual.catGroupPresent) {
                            currentCat = dataPoint.categoryGroup;
                        } else if (!Visual.catGroupPresent && Visual.xParentPresent) {
                            currentCat = dataPoint.xCategoryParent;
                        }
                        if (Visual.xParentPresent) {
                            currentXParent = dataPoint.xCategoryParent;
                        }
                        if (currentCat.length > catMaxLen) {
                            catMaxLen = currentCat.length;
                            this.catLongestText = currentCat;
                        }
                        if (currentXParent.length > xParentMaxLen) {
                            xParentMaxLen = currentXParent.length;
                            this.xParentLongestText = currentXParent;
                        }
                        dataPoint.selectionId = selectionId;
                        boxWhiskerdataPoints.dataPoints.push(dataPoint);
                    }
                }
            }); return boxAndWhiskerHelperArray;
        }

        public renderVisualColor(grouped, colorPalette, host, dataView) {
            if (Visual.isColorCategoryPresent) {
                Visual.legendDataPoints = grouped
                    .filter((group: DataViewValueColumnGroup) => group.identity)
                    .map((group: DataViewValueColumnGroup, index: number) => {
                        const defaultColor: Fill = {
                            solid: {
                                color: colorPalette.getColor(<any>group.name).value
                            }
                        };
                        return {
                            category: boxWhiskerUtils.convertToString(group.name),
                            color: boxWhiskerSettings.DataViewObjects
                                .getValueOverload<Fill>(group.objects, 'colorSelector', 'fill', defaultColor).solid.color,
                            identity: host.createSelectionIdBuilder()
                                .withSeries(dataView.categorical.values, group)
                                .createSelectionId(),
                            selected: false,
                            value: index
                        };
                    });
            } else {
                if (Visual.catSizePresent) {
                    Visual.legendDataPoints.push({
                        category: 'Dummy data',
                        color: '',
                        identity: host.createSelectionIdBuilder()
                            .withCategory(null, 0)
                            .createSelectionId(),
                        selected: false,
                        value: 0
                    });
                    Visual.legendTitle = 'blank';
                }
            }
        }

        public updateSorting(dataView, elements, catParentElements) {
            for (const cat1 of dataView.categorical.categories) {
                if (cat1.source.roles.hasOwnProperty('categoryGroup')) {
                    if (cat1.source.displayName !== name) {
                        elements[2] = [];
                        elements[0] = valueFormatter.create({ format: cat1.source.format });
                        if (cat1.source.type.dateTime) {

                            cat1.values.forEach((element: string) => {

                                elements[2].push(elements[0].format(new Date(element)));
                            });

                        } else {
                            cat1.values.forEach((element: string) => {
                                elements[2].push(elements[0].format(element));
                            });
                        }
                        elements[3] = elements[2].filter(boxWhiskerUtils.getDistinctElements);
                        if (this.sortSetting.axis === 'desc') {
                            elements[3].reverse();
                        }
                    }
                }
                if (cat1.source.roles.hasOwnProperty('xCategoryParent')) {

                    elements[1] = cat1.source.displayName;
                    elements[0] = valueFormatter.create({ format: cat1.source.format });
                    if (cat1.source.type.dateTime) {
                        cat1.values.forEach((element: string) => {
                            catParentElements.push(elements[0].format(new Date(element)));
                        });
                    } else {
                        cat1.values.forEach((element: string) => {
                            catParentElements.push(elements[0].format(element));
                        });

                    }
                    cat1.values.forEach((element: string) => {
                        catParentElements.push(elements[0].format(element));
                    });
                    elements[4] = catParentElements.filter(boxWhiskerUtils.getDistinctElements);
                    if (this.sortSetting.parent === 'desc') {
                        elements[4].reverse();
                    }
                }
            }
            return elements;
        }

        public visualParentSetting(concatenatedCat, catParentElements, catDistinctElements, catDistinctParentElements, catElements) {
            if (Visual.xParentPresent && Visual.catGroupPresent) {
                for (let iCounter: number = 0; iCounter < catParentElements.length; iCounter++) {
                    concatenatedCat.push(`${catParentElements[iCounter]}$$$${catElements[iCounter]}`);
                }
                concatenatedCat = concatenatedCat.filter(boxWhiskerUtils.getDistinctElements);
                if (this.sortSetting.axis === 'desc' && this.sortSetting.parent === 'desc') {
                    concatenatedCat.reverse();
                } else if (this.sortSetting.parent === 'desc') {
                    const reversedParents: string[] = catDistinctParentElements; // already reversed catDistinctParentElements
                    concatenatedCat = [];
                    for (let iCounter: number = 0; iCounter < reversedParents.length; iCounter++) {
                        for (let jCounter: number = 0; jCounter < catParentElements.length; jCounter++) {
                            if (reversedParents[iCounter] === catParentElements[jCounter]) {
                                concatenatedCat.push(`${catParentElements[jCounter]}$$$${catElements[jCounter]}`);
                            }
                        }
                    }
                    concatenatedCat = concatenatedCat.filter(boxWhiskerUtils.getDistinctElements);
                } else if (this.sortSetting.axis === 'desc') {
                    concatenatedCat = [];
                    const newArray: string[] = [];
                    for (let iCounter: number = 0; iCounter < catDistinctParentElements.length; iCounter++) {
                        for (let jCounter: number = catParentElements.length - 1; jCounter >= 0; jCounter--) {
                            if (catDistinctParentElements[iCounter] === catParentElements[jCounter]) {
                                concatenatedCat.push(`${catParentElements[jCounter]}$$$${catElements[jCounter]}`);
                            }
                        }
                    }
                }
            }
            return concatenatedCat;
        }

        public caseBoxOneProperties(iterator, concatenatedCat) {
            for (iterator = 0; iterator < concatenatedCat.length; iterator++) {
                this.boxArray[iterator] = {
                    dataPoints: [],
                    mean: 0,
                    IQR: 0,
                    Q1: 0,
                    Q2: 0,
                    Q3: 0,
                    updatedXCategoryParent: null,
                    min: 0,
                    max: 0,
                    tooltipData: []
                };
            }
        }

        public caseBoxTwoProperties(iterator, catDistinctParentElements) {
            for (iterator = 0; iterator < catDistinctParentElements.length; iterator++) {
                this.boxArray[iterator] = {
                    dataPoints: [],
                    mean: 0,
                    IQR: 0,
                    Q1: 0,
                    Q2: 0,
                    Q3: 0,
                    updatedXCategoryParent: null,
                    min: 0,
                    max: 0,
                    tooltipData: []
                };
            }
        }

        public caseBoxThreeProperties(iterator, catDistinctElements) {
            for (iterator = 0; iterator < catDistinctElements.length; iterator++) {
                this.boxArray[iterator] = {
                    dataPoints: [],
                    mean: 0,
                    IQR: 0,
                    Q1: 0,
                    Q2: 0,
                    Q3: 0,
                    updatedXCategoryParent: null,
                    min: 0,
                    max: 0,
                    tooltipData: []
                };
            }
        }

        public visualTransform(
            options: VisualUpdateOptions, dataView: DataView,
            height: number,
            colors: IColorPalette,
            host: IVisualHost): IBoxWhiskerDataPoints {
            const boxWhiskerdataPoints: IBoxWhiskerDataPoints = {
                dataPoints: [],
                xTitleText: '',
                yTitleText: ''
            };
            let dataPoint: IBoxWhiskerViewModel;
            if (!dataView || !dataView.categorical || !dataView.categorical.values || !dataView.categorical.categories) {
                return null;
            }
            Visual.catSizePresent = false;
            Visual.xParentPresent = false;
            Visual.catGroupPresent = false;
            Visual.isColorCategoryPresent = false;
            Visual.isGradientPresent = false;
            this.categoryColorData = [];
            let xParentIndex: number = 0;
            let yParentIndex: number = 0;
            let catMaxLen: number = 0;
            let currentCat: string = '';
            let xParentMaxLen: number = 0;
            let currentXParent: string = '';
            const groups: DataViewValueColumnGroup[] = dataView.categorical.values.grouped();
            let iterator: number, name: string;
            let formatter: utils.formatting.IValueFormatter;
            let boxAndWhiskerHelperArray: any = [formatter, name, yParentIndex, xParentIndex];
            boxAndWhiskerHelperArray = this.visualTransformHelper(groups, iterator, dataPoint, host, dataView, boxWhiskerdataPoints, boxAndWhiskerHelperArray, currentCat,
                currentXParent, catMaxLen, xParentMaxLen);
            formatter = boxAndWhiskerHelperArray[0]; name = boxAndWhiskerHelperArray[1];
            yParentIndex = boxAndWhiskerHelperArray[2]; xParentIndex = boxAndWhiskerHelperArray[3];
            for (const iPoints of boxWhiskerdataPoints.dataPoints) {
                iPoints.updatedXCategoryParent = `${iPoints.xCategoryParent}$$$${iPoints.categoryGroup}`;
            }
            if (!Visual.catGroupPresent && Visual.xParentPresent) {
                boxWhiskerdataPoints.xTitleText = dataView.categorical.categories[xParentIndex].source.displayName;
                boxWhiskerdataPoints.yTitleText = dataView.categorical.values[yParentIndex].source.displayName;
            }
            // Creating colors
            Visual.legendDataPoints = [];
            const colorPalette: IColorPalette = host.colorPalette;
            const grouped: DataViewValueColumnGroup[] = dataView.categorical.values.grouped();
            this.renderVisualColor(grouped, colorPalette, host, dataView);
            // Sorting functionality
            let catElements: string[] = [];
            const catParentElements: string[] = [];
            let catDistinctElements: string[], catDistinctParentElements: string[];
            let concatenatedCat: string[] = [];
            let elements: any = [formatter, name, catElements, catDistinctElements, catDistinctParentElements];
            elements = this.updateSorting(dataView, elements, catParentElements);
            formatter = elements[0]; name = elements[1];
            catElements = elements[2]; catDistinctElements = elements[3];
            catDistinctParentElements = elements[4];
            concatenatedCat = this.visualParentSetting(concatenatedCat, catParentElements, catDistinctElements, catDistinctParentElements, catElements);
            this.boxArray = [];
            // initializing values and adding datapoints for a single box when only category is present
            if (boxWhiskerdataPoints.dataPoints.length > 0 && !Visual.xParentPresent && !Visual.catGroupPresent) {
                this.boxArray[0] = {
                    dataPoints: [],
                    mean: 0,
                    IQR: 0,
                    Q1: 0,
                    Q2: 0,
                    Q3: 0,
                    updatedXCategoryParent: null,
                    min: 0,
                    max: 0,
                    tooltipData: []
                };
                for (const item of boxWhiskerdataPoints.dataPoints) {
                    this.boxArray[0].dataPoints.push(item.value);
                    this.boxArray[0].updatedXCategoryParent = item.updatedXCategoryParent;
                }
                // initializing values and adding datapoints for boxes when category, categoryGroup and xCategoryParent are present
            } else if (Visual.xParentPresent && Visual.catGroupPresent) {
                this.caseBoxOneProperties(iterator, concatenatedCat);
                for (const item of boxWhiskerdataPoints.dataPoints) {
                    item.key = concatenatedCat.indexOf(item.updatedXCategoryParent) + 1;
                    this.boxArray[item.key - 1].dataPoints.push(item.value);
                    this.boxArray[item.key - 1].updatedXCategoryParent = item.updatedXCategoryParent;
                }
                // initializing values and adding datapoints for boxes when category and xCategoryParent are present
            } else if (Visual.xParentPresent && !Visual.catGroupPresent) {
                this.caseBoxTwoProperties(iterator, catDistinctParentElements);
                for (const item of boxWhiskerdataPoints.dataPoints) {
                    item.key = catDistinctParentElements.indexOf(item.xCategoryParent) + 1;
                    this.boxArray[item.key - 1].dataPoints.push(item.value);
                    this.boxArray[item.key - 1].updatedXCategoryParent = item.updatedXCategoryParent;
                }
                // initializing values and adding datapoints for boxes when category, categoryGroup and xCategory parent are present
            } else if (Visual.catGroupPresent) {
                this.caseBoxThreeProperties(iterator, catDistinctElements);
                for (const item of boxWhiskerdataPoints.dataPoints) {
                    item.key = catDistinctElements.indexOf(item.categoryGroup) + 1;
                    this.boxArray[item.key - 1].dataPoints.push(item.value);
                    this.boxArray[item.key - 1].updatedXCategoryParent = item.updatedXCategoryParent;
                }
            }
            boxWhiskerdataPoints.dataPoints.sort(boxWhiskerUtils.objectSort('key'));
            return boxWhiskerdataPoints;
        }

        public updateParentAxisHorizontal(xAttr, textProperties, flipSetting, yWidth, parent) {
            this.yParentAxis
                .append('g')
                .attr('transform', `translate(0, ${xAttr})`)
                .classed('boxWhisker_yParentAxis', true)
                .append('text')
                .text(textMeasurementService.getTailoredTextOrDefault(textProperties, flipSetting.flipParentText ?
                    1000 : yWidth))
                .attr('x', flipSetting.flipParentText ? 5 : 0)
                .attr('y', flipSetting.flipParentText ? -10 : 6)
                .attr('transform', flipSetting.flipParentText ? 'rotate(0)' : 'rotate(-90)')
                .attr('dy', '0.71em')
                .style('text-anchor', flipSetting.flipParentText ? 'start' : 'middle')
                .append('title')
                .text(parent);
        }

        public updateYTicksOne(j, yTicksLen, yScale, tickSettings, yAxisHeight, gridLinesSetting, width, xNextAttr) {
            if (j < yTicksLen) {
                if (tickSettings.showCategoryTicks) {
                    this.yParentAxis.append('line')
                        .classed('boxWhisker_yAxisGridLines', true)
                        .attr({
                            stroke: tickSettings.categoryTickColor,
                            'stroke-width': 0.5 + (tickSettings.categoryTickThickness / 100),
                            y1: -(yScale.rangeBand() / 2),
                            y2: -(yScale.rangeBand() / 2),
                            x1: 0,
                            x2: yAxisHeight,
                            transform: `translate(0, ${xNextAttr})`
                        });
                }
                if (gridLinesSetting.showCategoryGridLines) {
                    this.svgGridLines.append('line')
                        .classed('boxWhisker_yAxisGridLines', true)
                        .attr({
                            stroke: gridLinesSetting.categoryColor,
                            'stroke-width': 0.5 + (gridLinesSetting.categoryThickness / 100),
                            y1: -(yScale.rangeBand() / 2),
                            y2: -(yScale.rangeBand() / 2),
                            x1: 0,
                            x2: width,
                            transform: `translate(0, ${xNextAttr})`
                        });
                }
            }
        }

        public updateYTicksTwo(j, yTicksLen, yScale, width, xNextAttr) {
            if (j < yTicksLen - 1) {
                this.yAxis.append('line')
                    .classed('boxWhisker_yAxisGridLines', true)
                    .attr({
                        stroke: 'rgb(166, 166, 166)',
                        'stroke-width': 1,
                        y1: -(yScale.rangeBand() / 2),
                        y2: -(yScale.rangeBand() / 2),
                        x1: 0,
                        x2: width,
                        transform: `translate(0, ${xNextAttr})`
                    });
            }
        }

        public renderYHorizontalSVG(height, width) {
            this.svgGridLines.append('line')
                .classed('boxWhisker_xAxisGridLines', true)
                .attr({
                    stroke: 'rgb(166, 166, 166)',
                    'stroke-width': 1,
                    x1: 1,
                    x2: 1,
                    y1: 3,
                    y2: height
                });
            this.svgGridLines.append('line')
                .classed('boxWhisker_xAxisGridLines', true)
                .attr({
                    stroke: 'rgb(166, 166, 166)',
                    'stroke-width': 1,
                    x1: width,
                    x2: width,
                    y1: 3,
                    y2: height
                });
            this.svgGridLines.append('line')
                .classed('boxWhisker_yAxisGridLines', true)
                .attr({
                    stroke: 'rgb(166, 166, 166)',
                    'stroke-width': 1,
                    x1: width,
                    x2: 0,
                    y1: 3,
                    y2: 3
                });
            this.svgGridLines.append('line')
                .classed('boxWhisker_yAxisGridLines', true)
                .attr({
                    stroke: 'rgb(166, 166, 166)',
                    'stroke-width': 1,
                    x1: width,
                    x2: 0,
                    y1: height,
                    y2: height
                });
        }

        public renderHorizontalTickSetting(tickSettings, yAxisHeight, height, yAxisWidth) {
            if (tickSettings.showCategoryTicks && Visual.xParentPresent) {
                this.yParentAxisSvg.append('line')
                    .classed('boxWhisker_yAxisparentGridLines', true)
                    .attr({
                        stroke: tickSettings.categoryTickColor,
                        'stroke-width': 0.5 + (tickSettings.categoryTickThickness / 100),
                        x1: 0,
                        x2: yAxisHeight,
                        y1: Visual.margins.top + 3,
                        y2: Visual.margins.top + 3
                    });
                this.yParentAxisSvg.append('line')
                    .classed('boxWhisker_yAxisparentGridLines', true)
                    .attr({
                        stroke: tickSettings.categoryTickColor,
                        'stroke-width': 0.5 + (tickSettings.categoryTickThickness / 100),
                        x1: 0,
                        x2: yAxisHeight,
                        y1: height,
                        y2: height
                    });
            }
            if (tickSettings.showAxisTicks) {
                this.yAxisSvg.append('line')
                    .classed('boxWhisker_xAxisGridLines', true)
                    .attr({
                        stroke: tickSettings.color,
                        'stroke-width': 0.25 + (tickSettings.thickness / 133.33),
                        x1: 0,
                        x2: -yAxisWidth,
                        y1: height,
                        y2: height
                    })
                    .attr('transform', `translate(${Visual.margins.left}, 0)`);
            }
        }

        public alternatingColor(backgroundSetting, translate, yWidth, width, iCounter, gridLinesSetting) {
            if (backgroundSetting.show && Visual.xParentPresent && Visual.catGroupPresent) {
                translate -= (yWidth);
                this.svgGridLines.append('rect')
                    .classed('boxWhisker_xAxisGridRect', true)
                    .attr({
                        fill: iCounter % 2 === 0 ? backgroundSetting.bgPrimaryColor : backgroundSetting.bgSecondaryColor,
                        x: 0,
                        y: 0,
                        width: width - (1 + (gridLinesSetting.categoryThickness / 100)) < 0 ?
                            0 : width - (0.5 + (gridLinesSetting.categoryThickness / 100)), // 10,
                        height: yWidth,
                        'fill-opacity': (100 - backgroundSetting.bgTransparency) / 100
                    })
                    .attr('transform', `translate(0, ${translate})`);
            }
            return translate;
        }

        public updateParentCat(iterator, height, width, tickSettings, yAxisHeight, yAxisWidth, yScale, gridLinesSetting, properties,
            parentAxisConfigs, flipSetting, backgroundSetting) {
            // For category Parent
            if (!(!Visual.catGroupPresent && Visual.xParentPresent) || (!Visual.xParentPresent)) {
                this.yParentAxis.selectAll('.boxWhisker_xAxisGridLines').remove();
                let yTicks: any;
                yTicks = this.yAxisSvg.selectAll('.boxWhisker_yAxis .tick text');
                const yTicksLen: number = yTicks.size();
                const yParentTicks: string[] = [];
                let isBool: boolean = false;
                let iCounter: number = 0;
                let jIterator: number = 0; iterator = 0;
                properties[0] = height;
                this.renderYHorizontalSVG(height, width);
                this.renderHorizontalTickSetting(tickSettings, yAxisHeight, height, yAxisWidth);

                for (iterator = 0; iterator < yTicksLen; iterator++) {
                    isBool = false;
                    const parent: string = yTicks[0][iterator].getAttribute('data-parent');
                    let yWidth: number = 0;
                    let xAttr: any = yTicks[0][iterator].parentNode.getAttribute('transform').substring(12, yTicks[0][iterator]
                        .parentNode.getAttribute('transform').lastIndexOf(',') > 12 ? yTicks[0][iterator]
                            .parentNode.getAttribute('transform').lastIndexOf(',') : yTicks[0][iterator]
                                .parentNode.getAttribute('transform').length - 1);
                    for (jIterator = iterator; jIterator < yTicksLen; jIterator++) {
                        const nextParent: string = yTicks[0][jIterator].getAttribute('data-parent');
                        let xNextAttr: string = yTicks[0][jIterator].parentNode.getAttribute('transform').substring(12, yTicks[0][jIterator]
                            .parentNode.getAttribute('transform').lastIndexOf(',') > 12 ? yTicks[0][jIterator]
                                .parentNode.getAttribute('transform').lastIndexOf(',') : yTicks[0][jIterator]
                                    .parentNode.getAttribute('transform').length - 1);
                        if (parent === nextParent) {
                            isBool = true;
                            yWidth += yScale.rangeBand();
                            if (tickSettings.showAxisTicks) {
                                this.yAxis.append('line')
                                    .classed('boxWhisker_yAxisGridLines', true)
                                    .attr({
                                        stroke: tickSettings.color,
                                        'stroke-width': 0.25 + (tickSettings.thickness / 133.33),
                                        y1: -(yScale.rangeBand() / 2),
                                        y2: -(yScale.rangeBand() / 2),
                                        x1: 0,
                                        x2: -yAxisWidth,
                                        transform: `translate(0, ${xNextAttr})`
                                    });
                            }
                        } else if (isBool) {
                            xAttr = (parseFloat(xAttr) +
                                parseFloat(yTicks[0][jIterator - 1].parentNode.getAttribute('transform').substring(12, yTicks[0][jIterator - 1]
                                    .parentNode.getAttribute('transform').lastIndexOf(',') > 12 ? yTicks[0][jIterator - 1]
                                        .parentNode.getAttribute('transform').lastIndexOf(',') : yTicks[0][jIterator - 1]
                                            .parentNode.getAttribute('transform').length - 1))) / 2;
                            iterator = jIterator - 1;
                            xNextAttr = yTicks[0][iterator].parentNode.getAttribute('transform').substring(12, yTicks[0][iterator]
                                .parentNode.getAttribute('transform').lastIndexOf(',') > 12 ? yTicks[0][iterator]
                                    .parentNode.getAttribute('transform').lastIndexOf(',') : yTicks[0][iterator]
                                        .parentNode.getAttribute('transform').length - 1);
                            this.updateYTicksOne(jIterator, yTicksLen, yScale, tickSettings, yAxisHeight, gridLinesSetting, width, xNextAttr);
                            break;
                        } else {
                            xNextAttr = yTicks[0][jIterator - 1].parentNode.getAttribute('transform').substring(12, yTicks[0][jIterator - 1]
                                .parentNode.getAttribute('transform').lastIndexOf(',') > 12 ? yTicks[0][jIterator - 1]
                                    .parentNode.getAttribute('transform').lastIndexOf(',') : yTicks[0][jIterator - 1]
                                        .parentNode.getAttribute('transform').length - 1);
                            this.updateYTicksTwo(jIterator, yTicksLen, yScale, width, xNextAttr);
                            break;
                        }
                    }
                    if (jIterator === yTicksLen && isBool) {
                        xAttr = (parseFloat(xAttr) + parseFloat(yTicks[0][jIterator - 1]
                            .parentNode.getAttribute('transform').substring(12, yTicks[0][jIterator - 1]
                                .parentNode.getAttribute('transform').indexOf(',') > 12 ? yTicks[0][jIterator - 1]
                                    .parentNode.getAttribute('transform').indexOf(',') : yTicks[0][jIterator - 1]
                                        .parentNode.getAttribute('transform').length - 1))) / 2;
                        iterator = jIterator - 1;
                    }
                    properties[1] = {
                        fontFamily: parentAxisConfigs.fontFamily,
                        fontSize: `${parentAxisConfigs.fontSize}px`,
                        text: parent
                    };
                    this.updateParentAxisHorizontal(xAttr, properties[1], flipSetting, yWidth, parent);
                    // Alternating bg color logic
                    properties[0] = this.alternatingColor(backgroundSetting, properties[0], yWidth, width, iCounter, gridLinesSetting);
                    iCounter++;
                }

            }
            return properties;
        }

        public renderYHorizontalTitle(yAxisConfig, yAxisTitleText, heightForXAxis) {
            if (yAxisConfig.showTitle) {
                const yTitleTextProps: TextProperties = {
                    fontFamily: yAxisConfig.titleFontFamily,
                    fontSize: `${yAxisConfig.titleSize}px`,
                    text: yAxisTitleText
                };
                this.yTitle
                    .classed('boxWhisker_yTitle', true)
                    .attr('transform', `translate(5,${heightForXAxis / 2})`)
                    .append('text')
                    .attr('transform', 'rotate(-90)')
                    .attr('dy', '0.71em')
                    .attr('text-anchor', 'middle')
                    .style('font-size', `${yAxisConfig.titleSize}px`)
                    .style('font-family', yAxisConfig.titleFontFamily)
                    .style('fill', yAxisConfig.titleColor)
                    .text(textMeasurementService.getTailoredTextOrDefault(yTitleTextProps, heightForXAxis))
                    .append('title')
                    .text(yAxisTitleText);
            }

        }

        public renderXHorizontalThree(gridLinesSetting, height, xAxisConfig, xAxisTitleText, widthForXAxis, textProperties, xAxisFormatter, width) {
            if (xAxisConfig.show) {
                // Draw X Axis grid lines
                let xTicks: any;
                xTicks = this.xAxisSvg.selectAll('.boxWhisker_xAxis .tick');
                const tickLeng: number = xTicks.size();

                let start: number = 0;
                if (gridLinesSetting.showAxisGridLines) {
                    for (; start < tickLeng; start++) {

                        const xCoordinate: string = xTicks[0][start]
                            .getAttribute('transform')
                            .substring(10, xTicks[0][start]
                                .getAttribute('transform')
                                .indexOf(',') >= 0 ? xTicks[0][start]
                                    .getAttribute('transform')
                                    .indexOf(',') : xTicks[0][start]
                                        .getAttribute('transform').length - 1);
                        this.axisGridLines.append('line')
                            .classed('boxWhisker_xAxisGrid', true).attr({
                                stroke: gridLinesSetting.color,
                                'stroke-width': 0.25 + (gridLinesSetting.thickness / 133.33),
                                x1: xCoordinate,
                                x2: xCoordinate,
                                y1: (height),
                                y2: 3
                            });
                    }
                }

                this.xAxis.selectAll('path')
                    .remove();

                if (xAxisConfig.showTitle) {
                    const xTitleTextProps: TextProperties = {
                        fontFamily: xAxisConfig.titleFontFamily,
                        fontSize: `${xAxisConfig.titleSize}px`,
                        text: xAxisTitleText
                    };
                    this.xTitle
                        .classed('boxWhisker_xTitle', true)
                        .attr('transform', `translate(${Visual.margins.left + (widthForXAxis / 2)}, ${Visual.margins.bottom - 5})`)
                        .append('text')
                        .attr('dy', '-0.32em')
                        .attr('text-anchor', 'middle')
                        .style('font-size', `${xAxisConfig.titleSize}px`)
                        .style('font-family', xAxisConfig.titleFontFamily)
                        .style('fill', xAxisConfig.titleColor)
                        .text(textMeasurementService.getTailoredTextOrDefault(xTitleTextProps, widthForXAxis))
                        .append('title')
                        .text(xAxisTitleText);
                }

                this.xAxisSvg.selectAll('.boxWhisker_xAxis .tick text')
                    .style('font-size', `${xAxisConfig.fontSize}px`)
                    .style('font-family', xAxisConfig.labelsFontFamily)
                    .style('fill', xAxisConfig.fontColor)
                    .text((d: string): string => {
                        textProperties = {
                            fontFamily: xAxisConfig.labelsFontFamily,
                            fontSize: `${xAxisConfig.fontSize}px`,
                            text: xAxisFormatter.format(d)
                        };

                        return textMeasurementService
                            .getTailoredTextOrDefault(textProperties, ((width - Visual.margins.left) /
                                axis.getRecommendedNumberOfTicksForXAxis(width)) - 5);
                    });

                //tooltip information adding
                const tooptipFormatter: utils.formatting.IValueFormatter = valueFormatter.create({
                    format: this.measureFormat
                });
                d3.selectAll('.boxWhisker_xAxis .tick text')
                    .append('title')
                    .text((d: string): string => {
                        return tooptipFormatter.format(d);
                    });
            } else {
                this.xAxisSvg.selectAll('.boxWhisker_xAxis .tick text').text('');
                this.xAxis.selectAll('path').remove();
            }
        }

        public renderHorizontalBox(boxOptionsSettings, data, xScale, yScale, rScale, rangeConfig, gradientSelectorSetting, boxWidth) {
            // plotting boxes, whiskers, median lines
            // plotting box below median (Q2)
            const boxesLower: d3.selection.Update<IBoxDataPoints> = this.dotsContainer.selectAll('.boxLower')
                .data(this.boxArray.filter((d: IBoxDataPoints): boolean => d.dataPoints.length > 0));

            if (this.boxOptionsSetting.boxWidth === 'Small') {
                boxWidth /= 2;
            } else if (this.boxOptionsSetting.boxWidth === 'Large') {
                boxWidth *= 1.5;
            }

            boxesLower.enter()
                .append('rect')
                .classed('boxLower', true);

            boxesLower.attr({
                x: (d: IBoxDataPoints): number => xScale(d.Q1),
                y: (d: IBoxDataPoints): number => yScale(d.updatedXCategoryParent) + yScale.rangeBand() / 2 - boxWidth / 2,
                width: (d: IBoxDataPoints): number => xScale(d.Q2) - xScale(d.Q1),
                height: (d: IBoxDataPoints): number => boxWidth,
                fill: this.boxOptionsSetting.boxLowerColor,
                'fill-opacity': (100 - this.boxOptionsSetting.boxTransparency) / 100
            });

            // plotting box above median (Q2)
            const boxesUpper: d3.selection.Update<IBoxDataPoints> = this.dotsContainer.selectAll('.boxUpper')
                .data(this.boxArray.filter((d: IBoxDataPoints): boolean => d.dataPoints.length > 0));

            boxesUpper.enter()
                .append('rect')
                .classed('boxUpper', true);

            boxesUpper.attr({
                x: (d: IBoxDataPoints): number => xScale(d.Q2),
                y: (d: IBoxDataPoints): number => yScale(d.updatedXCategoryParent) + yScale.rangeBand() / 2 - boxWidth / 2,
                width: (d: IBoxDataPoints): number => xScale(d.Q3) - xScale(d.Q2),
                height: (d: IBoxDataPoints): number => boxWidth,
                fill: this.boxOptionsSetting.boxUpperColor,
                'fill-opacity': (100 - this.boxOptionsSetting.boxTransparency) / 100
            });
            if (rangeConfig.dots || boxOptionsSettings.outliers) {
                const boxWhiskerdot: any = this.dotsContainer.selectAll('.boxWhisker_dot');
                let circles: any;

                // filters dots based on whether outliers are disabled or enabled
                if (!boxOptionsSettings.outliers) {
                    circles = boxWhiskerdot.data(data.dataPoints.filter((outlier: IBoxWhiskerViewModel) =>
                        outlier.value >= this.boxArray[outlier.key - 1].min
                        && outlier.value <= this.boxArray[outlier.key - 1].max));
                } else if (!rangeConfig.dots) {
                    circles = boxWhiskerdot.data(data.dataPoints.filter((outlier: IBoxWhiskerViewModel) =>
                        outlier.value < this.boxArray[outlier.key - 1].min
                        || outlier.value > this.boxArray[outlier.key - 1].max));
                } else {
                    circles = boxWhiskerdot.data(data.dataPoints);
                }

                circles.enter()
                    .append('circle')
                    .classed('boxWhisker_dot', true);

                circles.attr({
                    cx: (d: IBoxWhiskerViewModel): number => xScale(d.value),
                    cy: (d: IBoxWhiskerViewModel): number => yScale(d.updatedXCategoryParent) + yScale.rangeBand() / 2,
                    r: (d: IBoxWhiskerViewModel): number => rScale(d.categorySize),
                    'fill-opacity': (100 - rangeConfig.transparency) / 100,
                    stroke: rangeConfig.border ? rangeConfig.borderColor : 'none',
                    'stroke-opacity': (100 - rangeConfig.transparency) / 100,
                    'stroke-width': 2
                });

                // Gradient logic
                if (!Visual.isGradientPresent) {
                    circles.attr({ fill: (d: IBoxWhiskerViewModel): string => boxWhiskerUtils.getColor(rangeConfig, d) });
                } else {
                    let minGradientValue: number = 9999999999999;
                    let maxGradientValue: number = 0;

                    this.categoryColorData.forEach((element: any) => {
                        if (parseFloat(element) < minGradientValue) {
                            minGradientValue = element;
                        }
                        if (parseFloat(element) > maxGradientValue) {
                            maxGradientValue = element;
                        }
                    });
                    const colorScale: d3.scale.Linear<number, number> = d3.scale.linear()
                        .domain([minGradientValue, maxGradientValue])
                        .range([0, 1]);
                    const colors: (t: number) => string = d3.interpolateRgb(gradientSelectorSetting.minColor,
                        gradientSelectorSetting.maxColor);
                    circles.attr('fill', (d: IBoxWhiskerViewModel): string => {
                        return colors(colorScale(parseFloat(d.categoryColor)));
                    });
                }
            }
            return boxWidth;
        }

        // plotting mean
        public renderHorizontalMean(yScale, xScale) {
            if (this.meanSetting.show) {
                const shapeMean: d3.selection.Update<IBoxDataPoints> = this.dotsContainer.selectAll('.shapeMean')
                    .data(this.boxArray.filter((d: IBoxDataPoints): boolean => d.dataPoints.length > 0));

                let meanWidth: number = yScale.rangeBand() / 16;
                if (this.meanSetting.meanWidth === 'Small') {
                    meanWidth /= 1.5;
                } else if (this.meanSetting.meanWidth === 'Large') {
                    meanWidth *= 1.5;
                }

                if (this.meanSetting.meanShape === 'Circle') {                              // circular shape

                    shapeMean.enter()
                        .append('circle')
                        .classed('shapeMean', true);

                    shapeMean.attr({
                        cx: (d: IBoxDataPoints): number => xScale(d.mean),
                        cy: (d: IBoxDataPoints): number => yScale(d.updatedXCategoryParent) + yScale.rangeBand() / 2,
                        r: (d: IBoxDataPoints): number => meanWidth,
                        stroke: this.boxOptionsSetting.whiskerColor,
                        'stroke-width': 2,
                        fill: this.meanSetting.meanColor
                    });

                } else if (this.meanSetting.meanShape === 'Square') {                         // square shape

                    shapeMean.enter()
                        .append('rect')
                        .classed('shapeMean', true);

                    shapeMean.attr({
                        x: (d: IBoxDataPoints): number => xScale(d.mean) - meanWidth,
                        y: (d: IBoxDataPoints): number => yScale(d.updatedXCategoryParent) + yScale.rangeBand() / 2 - meanWidth,
                        width: (d: IBoxDataPoints): number => meanWidth * 2,
                        height: (d: IBoxDataPoints): number => meanWidth * 2,
                        stroke: this.boxOptionsSetting.whiskerColor,
                        'stroke-width': 2,
                        fill: this.meanSetting.meanColor
                    });

                } else {                                                                        // triangular shape

                    const arc: any = d3.svg.symbol().type('triangle-down')
                        .size((d: IBoxDataPoints): number => { return 2 * meanWidth * meanWidth; });

                    shapeMean.enter()
                        .append('path')
                        .classed('shapeMean', true);

                    shapeMean.attr({
                        d: arc,
                        transform: (d: IBoxDataPoints): string => {
                            return `translate(${xScale(d.mean)},
                                ${yScale(d.updatedXCategoryParent) + yScale.rangeBand() / 2}) rotate(90)`;
                        },
                        stroke: this.boxOptionsSetting.whiskerColor,
                        'stroke-width': 2,
                        'fill-opacity': this.meanSetting.meanColor,
                        fill: this.meanSetting.meanColor
                    });
                    shapeMean.exit().remove();

                }
            }
        }

        public renderYHorizontalOne(yAxisConfig, yAxisTitleText, dimensions, flipSetting, parentAxisConfigs, measureTextProperties) {
            if (yAxisConfig.show) {
                if (yAxisConfig.showTitle) {
                    const yTitleTextProperties: TextProperties = {
                        fontFamily: yAxisConfig.titleFontFamily,
                        fontSize: `${yAxisConfig.titleSize}px`,
                        text: yAxisTitleText
                    };
                    dimensions[0] = textMeasurementService.measureSvgTextHeight(yTitleTextProperties) + 5;
                    Visual.margins.left = dimensions[0];
                }
                const catTextProperties: TextProperties = {
                    fontFamily: yAxisConfig.labelsFontFamily,
                    fontSize: `${yAxisConfig.fontSize}px`,
                    text: this.catLongestText
                };
                dimensions[2] = flipSetting.flipText ?
                    textMeasurementService.measureSvgTextWidth(catTextProperties) + 5 :
                    textMeasurementService.measureSvgTextHeight(catTextProperties) + 5;
                Visual.margins.left += dimensions[2];
                const parentTextProperties: TextProperties = {
                    fontFamily: parentAxisConfigs.fontFamily,
                    fontSize: `${parentAxisConfigs.fontSize}px`,
                    text: this.xParentLongestText
                };
                if (Visual.catGroupPresent && Visual.xParentPresent) {
                    dimensions[1] = flipSetting.flipParentText ?
                        textMeasurementService.measureSvgTextWidth(parentTextProperties) + 15 :
                        textMeasurementService.measureSvgTextHeight(parentTextProperties);
                } else {
                    const measureTextWidth: number = textMeasurementService.measureSvgTextWidth(measureTextProperties);
                    dimensions[1] = measureTextWidth / 2;
                }
                if (this.parentAxisConfigs.split) {
                    Visual.margins.right = dimensions[1];
                } else {
                    dimensions[1] = dimensions[1];
                    Visual.margins.left += dimensions[1] + 5;
                    const measureTextWidth: number = textMeasurementService.measureSvgTextWidth(measureTextProperties) + 2;
                    Visual.margins.right = measureTextWidth / 2;
                }
            } else {
                const measureTextWidth: number = textMeasurementService.measureSvgTextWidth(measureTextProperties) + 2; //2 for (-) sign in labels
                Visual.margins.right = measureTextWidth / 2;
                Visual.margins.left = measureTextWidth / 2;
            }
            return dimensions;
        }

        public renderHorizontalQuartile(xScale, yScale, boxWidth) {
            // plotting Q1
            const lineQ1: d3.selection.Update<IBoxDataPoints> = this.dotsContainer.selectAll('.boxOutlineQ1')
                .data(this.boxArray.filter((d: IBoxDataPoints): boolean => d.dataPoints.length > 0));

            lineQ1.enter()
                .append('line')
                .classed('boxOutlineQ1', true);

            lineQ1.attr({
                stroke: this.boxOptionsSetting.whiskerColor,
                'stroke-width': 2,
                'stroke-opacity': (100 - this.boxOptionsSetting.whiskerTransparency) / 100,
                x1: (d: IBoxDataPoints): number => xScale(d.Q1),
                x2: (d: IBoxDataPoints): number => xScale(d.Q1),
                y1: (d: IBoxDataPoints): number => yScale(d.updatedXCategoryParent) + yScale.rangeBand() / 2 - boxWidth / 2,
                y2: (d: IBoxDataPoints): number => yScale(d.updatedXCategoryParent) + yScale.rangeBand() / 2 + boxWidth / 2
            });

            // plotting Q3
            const lineQ3: d3.selection.Update<IBoxDataPoints> = this.dotsContainer.selectAll('.boxOutlineQ3')
                .data(this.boxArray.filter((d: IBoxDataPoints): boolean => d.dataPoints.length > 0));

            lineQ3.enter()
                .append('line')
                .classed('boxOutlineQ3', true);

            lineQ3.attr({
                stroke: this.boxOptionsSetting.whiskerColor,
                'stroke-width': 2,
                'stroke-opacity': (100 - this.boxOptionsSetting.whiskerTransparency) / 100,
                x1: (d: IBoxDataPoints): number => xScale(d.Q3),
                x2: (d: IBoxDataPoints): number => xScale(d.Q3),
                y1: (d: IBoxDataPoints): number => yScale(d.updatedXCategoryParent) + yScale.rangeBand() / 2 - boxWidth / 2,
                y2: (d: IBoxDataPoints): number => yScale(d.updatedXCategoryParent) + yScale.rangeBand() / 2 + boxWidth / 2
            });

            // plotting lower whisker (vertical line)
            const lineMin: d3.selection.Update<IBoxDataPoints> = this.dotsContainer.selectAll('.whiskerMin')
                .data(this.boxArray.filter((d: IBoxDataPoints): boolean => d.dataPoints.length > 0));

            lineMin.enter()
                .append('line')
                .classed('whiskerMin', true);

            lineMin.attr({
                stroke: this.boxOptionsSetting.whiskerColor,
                'stroke-width': 2,
                'stroke-opacity': (100 - this.boxOptionsSetting.whiskerTransparency) / 100,
                x1: (d: IBoxDataPoints): number => xScale(d.min),
                x2: (d: IBoxDataPoints): number => xScale(d.min),
                y1: (d: IBoxDataPoints): number => yScale(d.updatedXCategoryParent) + yScale.rangeBand() / 2 - boxWidth / 2,
                y2: (d: IBoxDataPoints): number => yScale(d.updatedXCategoryParent) + yScale.rangeBand() / 2 + boxWidth / 2
            });

            // plotting upper whisker (vertical line)
            const lineMax: d3.selection.Update<IBoxDataPoints> = this.dotsContainer.selectAll('.whiskerMax')
                .data(this.boxArray.filter((d: IBoxDataPoints): boolean => d.dataPoints.length > 0));

            lineMax.enter()
                .append('line')
                .classed('whiskerMax', true);

            lineMax.attr({
                stroke: this.boxOptionsSetting.whiskerColor,
                'stroke-width': 2,
                'stroke-opacity': (100 - this.boxOptionsSetting.whiskerTransparency) / 100,
                x1: (d: IBoxDataPoints): number => xScale(d.max),
                x2: (d: IBoxDataPoints): number => xScale(d.max),
                y1: (d: IBoxDataPoints): number => yScale(d.updatedXCategoryParent) + yScale.rangeBand() / 2 - boxWidth / 2,
                y2: (d: IBoxDataPoints): number => yScale(d.updatedXCategoryParent) + yScale.rangeBand() / 2 + boxWidth / 2
            });

            // plotting lower whisker (horizontal line)
            const lineMinBox: d3.selection.Update<IBoxDataPoints> = this.dotsContainer.selectAll('.whiskerMinBox')
                .data(this.boxArray.filter((d: IBoxDataPoints): boolean => d.dataPoints.length > 0));

            lineMinBox.enter()
                .append('line')
                .classed('whiskerMinBox', true);

            lineMinBox.attr({
                stroke: this.boxOptionsSetting.whiskerColor,
                'stroke-width': 2,
                'stroke-opacity': (100 - this.boxOptionsSetting.whiskerTransparency) / 100,
                x1: (d: IBoxDataPoints): number => xScale(d.min),
                x2: (d: IBoxDataPoints): number => xScale(d.Q1),
                y1: (d: IBoxDataPoints): number => yScale(d.updatedXCategoryParent) + yScale.rangeBand() / 2,
                y2: (d: IBoxDataPoints): number => yScale(d.updatedXCategoryParent) + yScale.rangeBand() / 2
            });
        }

        // calcualte minimum width for Y-Axis labels
        public calculateMinWidthHorizontal(yAxisConfig, minWidth) {
            if (yAxisConfig.minWidth || yAxisConfig.minWidth === 0) {
                if (yAxisConfig.minWidth > 300) {
                    yAxisConfig.minWidth = 300;
                    minWidth = 300;
                } else if (yAxisConfig.minWidth < 5) {
                    yAxisConfig.minWidth = 5;
                    minWidth = 5;
                } else {
                    minWidth = yAxisConfig.minWidth;
                }
                if (yAxisConfig.minWidth < yAxisConfig.fontSize) {
                    yAxisConfig.minWidth = yAxisConfig.fontSize;
                    minWidth = yAxisConfig.fontSize;
                }
            }
            return minWidth;
        }

        public updateScrollLogic(yAxisConfig, minWidth, yAxisPoints, scrollHelperArray, yAxisHeight, originalSvgWidth, yTitleHeight) {
            // Scroll logic
            if ((minWidth * yAxisPoints) > (scrollHelperArray[0])) {
                scrollHelperArray[0] = (minWidth * yAxisPoints);
                scrollHelperArray[1] = scrollHelperArray[1] - 20 < 0 ? 0 : scrollHelperArray[1] - 20;
                scrollHelperArray[3].range([0, scrollHelperArray[1]]);
                scrollHelperArray[2].rangeBands([scrollHelperArray[0], 3]);
                this.svg.attr({
                    width: scrollHelperArray[1],
                    height: scrollHelperArray[0]
                });
                this.yParentAxisSvg.attr({
                    height: scrollHelperArray[0],
                    width: `${(yAxisHeight / (originalSvgWidth - 20)) * 100}%`
                });
                if (this.parentAxisConfigs.split) {
                    this.yParentAxisSvg.style('margin-left', `${scrollHelperArray[1] + Visual.margins.left}px`);
                } else {
                    this.yParentAxisSvg.style('margin-left', `${yTitleHeight}px`);
                }
                this.yAxisSvg.attr({
                    width: Visual.margins.left,
                    height: scrollHelperArray[0]
                });
            }
            return scrollHelperArray;
        }

        public updateHorizontalSVG() {
            if (this.xAxisSvg) {
                this.xAxisSvg.remove();
            }
            if (this.yAxisSvg) {
                this.yAxisSvg.remove();
            }
            if (this.yParentAxisSvg) {
                this.yParentAxisSvg.remove();
            }
            if (this.xParentAxisSvg) {
                this.xParentAxisSvg.remove();
            }
            this.xAxisSvg = this.baseContainer
                .append('svg')
                .classed('boxWhisker_xAxisSvg', true);
            this.xAxis = this.xAxisSvg
                .append('g')
                .classed('boxWhisker_xAxis', true);
            this.yAxisSvg = this.scrollableContainer.append('svg')
                .classed('boxWhisker_yAxisSvg', true);
            this.yAxis = this.yAxisSvg
                .append('g')
                .classed('boxWhisker_yAxis', true);
            this.yTitle = this.yAxisSvg.append('g')
                .classed('boxWhisker_yAxis boxWhisker_yTitle', true);
            this.xTitle = this.xAxisSvg.append('g')
                .classed('boxWhisker_xAxis boxWhisker_xTitle', true);
            this.yParentAxisSvg = this.scrollableContainer.append('svg')
                .classed('boxWhisker_yParentAxisSvg', true);
            this.yParentAxis = this.yParentAxisSvg
                .append('g')
                .classed('boxWhisker_yParentAxis', true);
            Visual.margins.right = 0;
            Visual.margins.left = 0;
            Visual.margins.bottom = 0;
            Visual.margins.top = 0;
        }

        public renderXHorizontalOne(xAxisConfig, measureTextProperties, xAxisTitleText, xAxisParentHeight) {
            if (xAxisConfig.show) {
                let xTitleHeight: number = 0;
                if (xAxisConfig.showTitle) {
                    const xTitleTextProperties: TextProperties = {
                        fontFamily: xAxisConfig.titleFontFamily,
                        fontSize: `${xAxisConfig.titleSize}px`,
                        text: xAxisTitleText
                    };
                    xTitleHeight = textMeasurementService.measureSvgTextHeight(xTitleTextProperties);
                    Visual.margins.bottom = xTitleHeight + 5;
                }
                const xAxisHeight: number = textMeasurementService.measureSvgTextHeight(measureTextProperties) + 5;
                Visual.margins.bottom += xAxisHeight;
            } else {
                Visual.margins.bottom = 5;
                xAxisParentHeight = 0;
            }
            return xAxisParentHeight;
        }

        public updateHorizontalDomain(xAxisConfig, domain) {
            if (xAxisConfig.start || xAxisConfig.start === 0) {
                if (xAxisConfig.end || xAxisConfig.end === 0) {
                    if (xAxisConfig.start < xAxisConfig.end) {
                        domain[0] = xAxisConfig.start;
                    }
                } else if (xAxisConfig.start < domain[1]) {
                    domain[0] = xAxisConfig.start;
                }
            }
            if (xAxisConfig.end || xAxisConfig.end === 0) {
                if (xAxisConfig.start || xAxisConfig.start === 0) {
                    if (xAxisConfig.start < xAxisConfig.end) {
                        domain[1] = xAxisConfig.end;
                    }
                } else if (xAxisConfig.end > domain[0]) {
                    domain[1] = xAxisConfig.end;
                }
            }
            return domain;
        }

        public updateDecimalPlaces(xAxisConfig, decimalPlaces) {
            if (xAxisConfig.decimalPlaces || xAxisConfig.decimalPlaces === 0) {
                if (xAxisConfig.decimalPlaces > 4) {
                    xAxisConfig.decimalPlaces = 4;
                    decimalPlaces = xAxisConfig.decimalPlaces;
                } else if (xAxisConfig.decimalPlaces < 0) {
                    xAxisConfig.decimalPlaces = null;
                } else {
                    decimalPlaces = xAxisConfig.decimalPlaces;
                }
            }
            return decimalPlaces;
        }

        public axisParentAdjustment(originalSvgWidth, originalSvgHeight, height, yTitleHeight, yAxisHeight, width) {
            // X Axis parent adjustment
            if (this.parentAxisConfigs.split) {
                this.yParentAxisSvg.attr({
                    width: `${(Visual.margins.right / originalSvgWidth) * 100}%`,
                    height: `${((height + Visual.margins.bottom) / originalSvgHeight) * 100}%`
                });
                this.yParentAxisSvg.style('margin-left', `${width + Visual.margins.left}px`);
            } else {
                this.yParentAxisSvg.attr({
                    width: `${(yAxisHeight / originalSvgWidth) * 100}%`,
                    height: `${((height + Visual.margins.bottom) / originalSvgHeight) * 100}%`
                });
                this.yParentAxisSvg.style('margin-left', `${yTitleHeight}px`);
            }
        }

        public renderXHorizontalTwo(xAxisConfig, xAxis) {
            // Draw X Axis
            if (xAxisConfig.show) {
                this.xAxis.attr('transform', `translate(${Visual.margins.left})`)
                    .call(xAxis);
                this.xAxisSvg.selectAll('.boxWhisker_xAxis .tick').append('title')
                    .text((d: string) => {
                        return d;
                    });
            }
        }

        public renderYHorizontalTwo(yAxisConfig, yAxisTitleText, heightForXAxis, yAxis, properties,
            flipSetting, yScale, yAxisWidth, iterator, height, width, tickSettings, yAxisHeight, gridLinesSetting, parentAxisConfigs,
            backgroundSetting) {

            // Update y-Axis labels
            if (yAxisConfig.show) {
                this.renderYHorizontalTitle(yAxisConfig, yAxisTitleText, heightForXAxis);
                this.yAxis
                    .attr('transform', `translate(${Visual.margins.left},0)`)
                    .call(yAxis);
                const yAxisSvgText: d3.Selection<{}> = this.yAxisSvg.selectAll('.boxWhisker_yAxis .tick text');
                yAxisSvgText
                    .style('font-size', `${yAxisConfig.fontSize}px`)
                    .style('font-family', yAxisConfig.labelsFontFamily)
                    .style('fill', yAxisConfig.fontColor)
                    .text((d: string): string => {
                        properties[1] = {
                            fontFamily: yAxisConfig.labelsFontFamily,
                            fontSize: `${yAxisConfig.fontSize}px`,
                            text: boxWhiskerUtils.getText(d)
                        };
                        return textMeasurementService.getTailoredTextOrDefault(properties[1], flipSetting.flipText ?
                            1000 : yScale.rangeBand());
                    })
                    .attr('data-parent', (d: string): string => {
                        return d.substring(0, d.indexOf('$$$') >= 0 ? d.indexOf('$$$') : 0);
                    });
                if (flipSetting.flipText) {
                    yAxisSvgText
                        .style('text-anchor', 'end')
                        .attr('transform', 'rotate(0)')
                        .attr('x', -3);
                } else {
                    yAxisSvgText
                        .style('text-anchor', 'middle')
                        .attr('transform', 'rotate(-90)')
                        .attr('y', -yAxisWidth / 2)
                        .attr('x', 0);
                }
                this.yAxis.selectAll('path')
                    .remove();
                this.xAxis.selectAll('path')
                    .remove();
                // For category Parent

                properties = this.updateParentCat(iterator, height, width, tickSettings, yAxisHeight, yAxisWidth, yScale, gridLinesSetting,
                    properties, parentAxisConfigs, flipSetting, backgroundSetting);

                this.yParentAxisSvg.selectAll('.boxWhisker_yParentAxis text')
                    .style('font-size', `${parentAxisConfigs.fontSize}px`)
                    .style('font-family', parentAxisConfigs.fontFamily)
                    .style('fill', parentAxisConfigs.fontColor);

                if (!Visual.catGroupPresent && Visual.xParentPresent) {
                    this.yAxisSvg.selectAll('.boxWhisker_yAxis .tick').append('title')
                        .text((d: string): string => {
                            return d.substring(0, d.indexOf('$$$'));
                        });
                } else {
                    this.yAxisSvg.selectAll('.boxWhisker_yAxis .tick').append('title')
                        .text((d: string): string => {
                            return d.substring(d.indexOf('$$$') >= 0 ? d.indexOf('$$$') + 3 : 0, d.length);
                        });
                }
            } else {
                this.yAxisSvg.selectAll('.boxWhisker_yAxis .tick text').text('');
                this.yAxisSvg.selectAll('path').remove();
            }
            return properties;
        }

        public axisAdjustment(height, originalSvgHeight, originalSvgWidth) {
            // X Axis adjustment
            this.xAxisSvg.attr({
                width: `100%`,
                height: `${((Visual.margins.bottom) / originalSvgHeight) * 100}%`
            });
            this.xAxisSvg.style({
                'margin-top': `${height}px`
            });
            // Y Axis adjustment
            this.yAxisSvg.attr({
                width: `${((Visual.margins.left) / originalSvgWidth) * 100}%`,
                height: `${((height + Visual.margins.bottom) / originalSvgHeight) * 100}%`
            });
        }

        public renderHorizontalWhisker(xScale, yScale, boxWidth) {

            const lineQ1: d3.selection.Update<IBoxDataPoints> = this.dotsContainer.selectAll('.boxOutlineQ1')
                .data(this.boxArray.filter((d: IBoxDataPoints): boolean => d.dataPoints.length > 0));
            lineQ1.enter().append('line').classed('boxOutlineQ1', true);
            lineQ1.attr({
                stroke: this.boxOptionsSetting.whiskerColor,
                'stroke-width': 2,
                'stroke-opacity': (100 - this.boxOptionsSetting.whiskerTransparency) / 100,
                x1: (d: IBoxDataPoints): number => xScale(d.Q1),
                x2: (d: IBoxDataPoints): number => xScale(d.Q1),
                y1: (d: IBoxDataPoints): number => yScale(d.updatedXCategoryParent) + yScale.rangeBand() / 2 - boxWidth / 2,
                y2: (d: IBoxDataPoints): number => yScale(d.updatedXCategoryParent) + yScale.rangeBand() / 2 + boxWidth / 2
            });
            // plotting Q3
            const lineQ3: d3.selection.Update<IBoxDataPoints> = this.dotsContainer.selectAll('.boxOutlineQ3')
                .data(this.boxArray.filter((d: IBoxDataPoints): boolean => d.dataPoints.length > 0));
            lineQ3.enter().append('line').classed('boxOutlineQ3', true);
            lineQ3.attr({
                stroke: this.boxOptionsSetting.whiskerColor,
                'stroke-width': 2,
                'stroke-opacity': (100 - this.boxOptionsSetting.whiskerTransparency) / 100,
                x1: (d: IBoxDataPoints): number => xScale(d.Q3),
                x2: (d: IBoxDataPoints): number => xScale(d.Q3),
                y1: (d: IBoxDataPoints): number => yScale(d.updatedXCategoryParent) + yScale.rangeBand() / 2 - boxWidth / 2,
                y2: (d: IBoxDataPoints): number => yScale(d.updatedXCategoryParent) + yScale.rangeBand() / 2 + boxWidth / 2
            });
            // plotting lower whisker (vertical line)
            const lineMin: d3.selection.Update<IBoxDataPoints> = this.dotsContainer.selectAll('.whiskerMin')
                .data(this.boxArray.filter((d: IBoxDataPoints): boolean => d.dataPoints.length > 0));
            lineMin.enter()
                .append('line')
                .classed('whiskerMin', true);
            lineMin.attr({
                stroke: this.boxOptionsSetting.whiskerColor,
                'stroke-width': 2,
                'stroke-opacity': (100 - this.boxOptionsSetting.whiskerTransparency) / 100,
                x1: (d: IBoxDataPoints): number => xScale(d.min),
                x2: (d: IBoxDataPoints): number => xScale(d.min),
                y1: (d: IBoxDataPoints): number => yScale(d.updatedXCategoryParent) + yScale.rangeBand() / 2 - boxWidth / 2,
                y2: (d: IBoxDataPoints): number => yScale(d.updatedXCategoryParent) + yScale.rangeBand() / 2 + boxWidth / 2
            });
            // plotting upper whisker (vertical line)
            const lineMax: d3.selection.Update<IBoxDataPoints> = this.dotsContainer.selectAll('.whiskerMax')
                .data(this.boxArray.filter((d: IBoxDataPoints): boolean => d.dataPoints.length > 0));
            lineMax.enter()
                .append('line')
                .classed('whiskerMax', true);
            lineMax.attr({
                stroke: this.boxOptionsSetting.whiskerColor,
                'stroke-width': 2,
                'stroke-opacity': (100 - this.boxOptionsSetting.whiskerTransparency) / 100,
                x1: (d: IBoxDataPoints): number => xScale(d.max),
                x2: (d: IBoxDataPoints): number => xScale(d.max),
                y1: (d: IBoxDataPoints): number => yScale(d.updatedXCategoryParent) + yScale.rangeBand() / 2 - boxWidth / 2,
                y2: (d: IBoxDataPoints): number => yScale(d.updatedXCategoryParent) + yScale.rangeBand() / 2 + boxWidth / 2
            });
            // plotting lower whisker (horizontal line)
            const lineMinBox: d3.selection.Update<IBoxDataPoints> = this.dotsContainer.selectAll('.whiskerMinBox')
                .data(this.boxArray.filter((d: IBoxDataPoints): boolean => d.dataPoints.length > 0));
            lineMinBox.enter()
                .append('line')
                .classed('whiskerMinBox', true);
            lineMinBox.attr({
                stroke: this.boxOptionsSetting.whiskerColor,
                'stroke-width': 2,
                'stroke-opacity': (100 - this.boxOptionsSetting.whiskerTransparency) / 100,
                x1: (d: IBoxDataPoints): number => xScale(d.min),
                x2: (d: IBoxDataPoints): number => xScale(d.Q1),
                y1: (d: IBoxDataPoints): number => yScale(d.updatedXCategoryParent) + yScale.rangeBand() / 2,
                y2: (d: IBoxDataPoints): number => yScale(d.updatedXCategoryParent) + yScale.rangeBand() / 2
            });
            // plotting upper whisker (horizontal line)
            const lineMaxBox: d3.selection.Update<IBoxDataPoints> = this.dotsContainer.selectAll('.whiskerMaxBox')
                .data(this.boxArray.filter((d: IBoxDataPoints): boolean => d.dataPoints.length > 0));

            lineMaxBox.enter()
                .append('line')
                .classed('whiskerMaxBox', true);

            lineMaxBox.attr({
                stroke: this.boxOptionsSetting.whiskerColor,
                'stroke-width': 2,
                'stroke-opacity': (100 - this.boxOptionsSetting.whiskerTransparency) / 100,
                x1: (d: IBoxDataPoints): number => xScale(d.max),
                x2: (d: IBoxDataPoints): number => xScale(d.Q3),
                y1: (d: IBoxDataPoints): number => yScale(d.updatedXCategoryParent) + yScale.rangeBand() / 2,
                y2: (d: IBoxDataPoints): number => yScale(d.updatedXCategoryParent) + yScale.rangeBand() / 2
            });
        }

        public updateFlipHorizontal(xAxisConfig, format, xAxisTitleText, yAxisConfig, yAxisTitleText, flipSetting,
            parentAxisConfigs, originalSvgHeight, originalSvgWidth, data, dataSizeValues, rangeMin, rangeMax, iterator, tickSettings,
            gridLinesSetting, backgroundSetting, boxOptionsSettings, rangeConfig, gradientSelectorSetting, translate,
            xAxisFormatter, xAxisParentHeight, yAxisHeight, yAxisWidth, width, height, xScale, yScale, rScale) {
            this.scrollableContainer.style({ 'overflow-x': 'hidden', 'overflow-y': 'auto' });
            this.updateHorizontalSVG();
            let measureTextProperties: TextProperties;
            let domainStart: number = boxWhiskerUtils.returnMin(Visual.dataValues);
            let domainEnd: number = boxWhiskerUtils.returnMax(Visual.dataValues);
            let domain: any = [domainStart, domainEnd];
            domain = this.updateHorizontalDomain(xAxisConfig, domain);
            domainStart = domain[0]; domainEnd = domain[1];

            const value: number =
                Math.abs(domainEnd) > Math.abs(domainStart) ? Math.abs(domainEnd) : Math.abs(domainStart);
            let decimalPlaces: number = 0;
            decimalPlaces = this.updateDecimalPlaces(xAxisConfig, decimalPlaces);
            xAxisFormatter = valueFormatter.create({
                format: format, precision: decimalPlaces, value: xAxisConfig.displayUnits === 0 ?
                    boxWhiskerUtils.getValueUpdated(value) : xAxisConfig.displayUnits
            });
            const formattedMaxMeasure: string = xAxisFormatter.format(value);
            measureTextProperties = {
                fontFamily: xAxisConfig.labelsFontFamily,
                fontSize: `${xAxisConfig.fontSize}px`,
                text: formattedMaxMeasure
            };
            xAxisParentHeight = this.renderXHorizontalOne(xAxisConfig, measureTextProperties, xAxisTitleText, xAxisParentHeight);
            let yTitleHeight: number = 0;
            let dimensions: any = [yTitleHeight, yAxisHeight, yAxisWidth];
            dimensions = this.renderYHorizontalOne(yAxisConfig, yAxisTitleText, dimensions, flipSetting, parentAxisConfigs, measureTextProperties);
            yTitleHeight = dimensions[0]; yAxisHeight = dimensions[1]; yAxisWidth = dimensions[2];
            Visual.margins.left -= 5;
            // Svg adjustment
            width = width - Visual.margins.left - Visual.margins.right < 0 ? 0 : width - Visual.margins.left - Visual.margins.right;// Svg adjustment
            height = height - Visual.margins.bottom < 0 ? 0 : height - Visual.margins.bottom;
            this.svg.attr('width', width);
            this.svg.attr('height', height);
            this.svg.style('margin-left', `${Visual.margins.left}px`);
            this.svg.style('margin-top', '0px');
            //Axis adjustment
            this.axisAdjustment(height, originalSvgHeight, originalSvgWidth);
            this.axisParentAdjustment(originalSvgWidth, originalSvgHeight, height, yTitleHeight, yAxisHeight, width);
            // Scales
            xScale = d3.scale.linear().domain([domainStart, domainEnd]).range([0, width]);
            yScale = d3.scale.ordinal().domain(data.dataPoints.map((d: IBoxWhiskerViewModel) => d.updatedXCategoryParent)).rangeBands([height, 3]);
            rScale = d3.scale.linear().domain([boxWhiskerUtils.returnMin(dataSizeValues), (boxWhiskerUtils.returnMax(dataSizeValues))]).range([rangeMin, rangeMax]);
            const widthForXAxis: number = width;
            const heightForXAxis: number = height;
            let textProperties: TextProperties = {
                fontFamily: xAxisConfig.labelsFontFamily,
                fontSize: `${xAxisConfig.fontSize}px`,
                text: this.catLongestText
            };
            const yAxisPoints: number = data.dataPoints.map((d: IBoxWhiskerViewModel) =>
                d.updatedXCategoryParent).filter(boxWhiskerUtils.getDistinctElements).length;
            // calcualte minimum width for Y-Axis labels
            let minWidth: number = 30;
            minWidth = this.calculateMinWidthHorizontal(yAxisConfig, minWidth);
            // Scroll logic
            let scrollHelperArray: any = [height, width, yScale, xScale];
            scrollHelperArray = this.updateScrollLogic(yAxisConfig, minWidth, yAxisPoints, scrollHelperArray, yAxisHeight, originalSvgWidth, yTitleHeight);
            height = scrollHelperArray[0]; width = scrollHelperArray[1];
            yScale = scrollHelperArray[2]; xScale = scrollHelperArray[3];
            this.scrollableContainer.style('width', `${Visual.margins.left + widthForXAxis + Visual.margins.right}px`);
            this.scrollableContainer.style('height', `${heightForXAxis}px`);
            this.scrollableContainer.style('margin-left', '0px');
            const yAxis: d3.svg.Axis = d3.svg.axis().scale(yScale).orient('left');
            const xAxis: d3.svg.Axis = d3.svg.axis().scale(xScale).ticks(axis.getRecommendedNumberOfTicksForXAxis(width)).orient('bottom');
            this.renderXHorizontalTwo(xAxisConfig, xAxis);
            let properties: any = [translate, textProperties];
            properties = this.renderYHorizontalTwo(yAxisConfig, yAxisTitleText, heightForXAxis, yAxis, properties, flipSetting, yScale,
                yAxisWidth, iterator, height, width, tickSettings, yAxisHeight, gridLinesSetting, parentAxisConfigs, backgroundSetting);
            translate = properties[0]; textProperties = properties[1];
            this.renderXHorizontalThree(gridLinesSetting, height, xAxisConfig, xAxisTitleText, widthForXAxis, textProperties, xAxisFormatter, width);
            let boxWidth: number = yScale.rangeBand() / 2;
            boxWidth = this.renderHorizontalBox(boxOptionsSettings, data, xScale, yScale, rScale, rangeConfig, gradientSelectorSetting, boxWidth);
            this.renderHorizontalQuartile(xScale, yScale, boxWidth);
            this.renderHorizontalWhisker(xScale, yScale, boxWidth);
            this.renderHorizontalMean(yScale, xScale);

        }

        public renderXVerticalTitle(xAxisConfig, xAxisTitleText, widthForXAxis) {
            if (xAxisConfig.showTitle) {
                const xTitleTextProps: TextProperties = {
                    fontFamily: xAxisConfig.titleFontFamily,
                    fontSize: `${xAxisConfig.titleSize}px`,
                    text: xAxisTitleText
                };
                this.xTitle
                    .classed('boxWhisker_xTitle', true)
                    .attr('transform', `translate(${widthForXAxis / 2},${Visual.margins.bottom - 5})`)
                    .append('text')
                    .attr('dy', '-0.32em')
                    .attr('text-anchor', 'middle')
                    .style('font-size', `${xAxisConfig.titleSize}px`)
                    .style('font-family', xAxisConfig.titleFontFamily)
                    .style('fill', xAxisConfig.titleColor)
                    .text(textMeasurementService.getTailoredTextOrDefault(xTitleTextProps, widthForXAxis))
                    .append('title')
                    .text(xAxisTitleText);
            }
        }

        public renderXVerticalSVG(xAxisConfig, textProperties, xScale) {
            this.xAxisSvg.selectAll('.boxWhisker_xAxis .tick text')
                .style('font-size', `${xAxisConfig.fontSize}px`)
                .style('font-family', xAxisConfig.labelsFontFamily)
                .style('fill', xAxisConfig.fontColor);

            this.xAxisSvg.selectAll('.boxWhisker_xAxis .tick text')
                .text((d: string): string => {
                    textProperties = {
                        fontFamily: xAxisConfig.labelsFontFamily,
                        fontSize: `${xAxisConfig.fontSize}px`,
                        text: boxWhiskerUtils.getText(d)
                    };

                    return textMeasurementService.getTailoredTextOrDefault(textProperties, xScale.rangeBand());
                })
                .attr('data-parent', (d: string): string => {
                    return d.substring(0, d.indexOf('$$$') >= 0 ? d.indexOf('$$$') : 0);
                });
        }

        public renderCategoryParentHelper(height, width) {
            this.svgGridLines.append('line')
                .classed('boxWhisker_xAxisGridLines', true)
                .attr({
                    stroke: 'rgb(166, 166, 166)',
                    'stroke-width': 1,
                    x1: 1,
                    x2: 1,
                    y1: 0,
                    y2: height
                });

            this.svgGridLines.append('line')
                .classed('boxWhisker_xAxisGridLines', true)
                .attr({
                    stroke: 'rgb(166, 166, 166)',
                    'stroke-width': 1,
                    x1: width - 2,
                    x2: width - 2,
                    y1: 0,
                    y2: height
                });

            this.svgGridLines.append('line')
                .classed('boxWhisker_yAxisGridLines', true)
                .attr({
                    stroke: 'rgb(166, 166, 166)',
                    'stroke-width': 1,
                    x1: 0,
                    x2: width - 2,
                    y1: 0,
                    y2: 0
                });

            this.svgGridLines.append('line')
                .classed('boxWhisker_yAxisGridLines', true)
                .attr({
                    stroke: 'rgb(166, 166, 166)',
                    'stroke-width': 1,
                    x1: 0,
                    x2: width - 2,
                    y1: (height),
                    y2: (height)
                });
        }

        public renderTickSetting(j, xTicksLen, isBool, xTicks, tickSettingHelperArray) {
            if (j === xTicksLen && isBool) {
                tickSettingHelperArray[0] = (parseFloat(tickSettingHelperArray[0]) + parseFloat(xTicks[0][j - 1]
                    .parentNode.getAttribute('transform').substring(10, xTicks[0][j - 1]
                        .parentNode.getAttribute('transform').indexOf(',') >= 0 ? xTicks[0][j - 1]
                            .parentNode.getAttribute('transform').indexOf(',') : xTicks[0][j - 1]
                                .parentNode.getAttribute('transform').length - 1))) / 2;
                                tickSettingHelperArray[1] = j - 1;
            }
            return tickSettingHelperArray;
        }

        public renderBackgroundSetting(backgroundSetting, iCounter, gridLinesSetting, xWidth, translate, height) {
            if (backgroundSetting.show && Visual.xParentPresent && Visual.catGroupPresent) {
                this.svgGridLines.append('rect')
                    .classed('boxWhisker_xAxisGridRect', true)
                    .attr({
                        fill: iCounter % 2 === 0 ? backgroundSetting.bgPrimaryColor : backgroundSetting.bgSecondaryColor,
                        x: 1,
                        y: 1,
                        width: gridLinesSetting.showCategoryGridLines ?
                            (xWidth - (1 + (gridLinesSetting.categoryThickness / 100))) : xWidth,
                        height: height,
                        'fill-opacity': (100 - backgroundSetting.bgTransparency) / 100
                    })
                    .attr('transform', `translate(${translate}, 0)`);

                translate += (xWidth);
            }
            return translate;
        }

        public renderParentAxis(xAttr, parent, textProperties, xWidth) {
            this.xParentAxis
                .append('g')
                .attr('transform', `translate(${xAttr}, 0)`)
                .classed('boxWhisker_xParentAxis', true)
                .append('text')
                .text(textMeasurementService.getTailoredTextOrDefault(textProperties, xWidth))
                .attr('x', 0)
                .attr('y', 9)
                .attr('dy', '0.71em')
                .style('text-anchor', 'middle')
                .append('title')
                .text(parent);
        }

        public renderCategoryParentHelperTwo(iterator, xTicksLen, isBool, xTicks, jIterator, xScale, tickSettings, xAxisHeight, xAxisParentHeight, gridLinesSetting,
            height, textProperties, parentAxisConfigs, backgroundSetting, iCounter, translate) {
            for (iterator = 0; iterator < xTicksLen; iterator++) {
                isBool = false;
                const parent: string = xTicks[0][iterator].getAttribute('data-parent');
                let xWidth: number = 0;
                let xAttr: any = xTicks[0][iterator].parentNode.getAttribute('transform').substring(10, xTicks[0][iterator]
                    .parentNode.getAttribute('transform').indexOf(',') >= 0 ? xTicks[0][iterator].parentNode.getAttribute('transform').indexOf(',') : xTicks[0][iterator]
                        .parentNode.getAttribute('transform').length - 1);
                for (jIterator = iterator; jIterator < xTicksLen; jIterator++) {
                    const nextParent: string = xTicks[0][jIterator].getAttribute('data-parent');
                    let xNextAttr: string = xTicks[0][jIterator].parentNode.getAttribute('transform').substring(10, xTicks[0][jIterator]
                        .parentNode.getAttribute('transform').indexOf(',') >= 0 ? xTicks[0][jIterator].parentNode.getAttribute('transform').indexOf(',') : xTicks[0][jIterator]
                            .parentNode.getAttribute('transform').length - 1);
                    if (parent === nextParent) {
                        isBool = true;
                        xWidth += xScale.rangeBand();
                        if (tickSettings.showAxisTicks) {
                            this.xAxis.append('line')
                                .classed('boxWhisker_xAxisGridLines', true)
                                .attr({
                                    stroke: tickSettings.color,
                                    'stroke-width': 0.25 + (tickSettings.thickness / 133.33),
                                    x1: xScale.rangeBand() / 2,
                                    x2: xScale.rangeBand() / 2,
                                    y1: 0, y2: xAxisHeight,
                                    transform: `translate(${xNextAttr}, 0)`
                                });
                        }
                    } else if (isBool) {
                        xAttr = (parseFloat(xAttr) + parseFloat(xTicks[0][jIterator - 1]
                            .parentNode.getAttribute('transform').substring(10, xTicks[0][jIterator - 1]
                                .parentNode.getAttribute('transform').indexOf(',') >= 0 ? xTicks[0][jIterator - 1]
                                    .parentNode.getAttribute('transform').indexOf(',') : xTicks[0][jIterator - 1].parentNode.getAttribute('transform').length - 1))) / 2;
                        iterator = jIterator - 1;
                        xNextAttr = xTicks[0][iterator]
                            .parentNode.getAttribute('transform').substring(10, xTicks[0][iterator]
                                .parentNode.getAttribute('transform').indexOf(',') >= 0 ? xTicks[0][iterator]
                                    .parentNode.getAttribute('transform').indexOf(',') : xTicks[0][iterator].parentNode.getAttribute('transform').length - 1);
                        if (jIterator < xTicksLen) {
                            if (tickSettings.showCategoryTicks) {
                                this.xParentAxis.append('line')
                                    .classed('boxWhisker_xAxisGridLines', true)
                                    .attr({
                                        stroke: tickSettings.categoryTickColor,
                                        'stroke-width': 0.5 + (tickSettings.categoryTickThickness / 100),
                                        x1: xScale.rangeBand() / 2,
                                        x2: xScale.rangeBand() / 2,
                                        y1: 0, y2: xAxisParentHeight + 5,
                                        transform: `translate(${xNextAttr}, 0)`
                                    });
                            }
                            if (gridLinesSetting.showCategoryGridLines) {
                                this.svgGridLines.append('line')
                                    .classed('boxWhisker_xAxisGridLines', true)
                                    .attr({
                                        stroke: gridLinesSetting.categoryColor,
                                        'stroke-width': 0.5 + (gridLinesSetting.categoryThickness / 100),
                                        x1: xScale.rangeBand() / 2,
                                        x2: xScale.rangeBand() / 2,
                                        y1: 0, y2: height,
                                        transform: `translate(${xNextAttr}, 0)`
                                    });
                            }
                        }
                        break;
                    } else {
                        xNextAttr = xTicks[0][jIterator - 1]
                            .parentNode.getAttribute('transform').substring(10, xTicks[0][jIterator - 1]
                                .parentNode.getAttribute('transform').indexOf(',') >= 0 ? xTicks[0][jIterator - 1]
                                    .parentNode.getAttribute('transform').indexOf(',') : xTicks[0][jIterator - 1].parentNode.getAttribute('transform').length - 1);
                        if (jIterator < xTicksLen - 1) {
                            this.xAxis.append('line')
                                .classed('boxWhisker_xAxisGridLines', true)
                                .attr({
                                    stroke: 'rgb(166, 166, 166)',
                                    'stroke-width': 1,
                                    x1: xScale.rangeBand() / 2,
                                    x2: xScale.rangeBand() / 2,
                                    y1: 0, y2: height,
                                    transform: `translate(${xNextAttr}, 0)`
                                });
                        } break;
                    }
                }
                let tickSettingHelperArray: any = [xAttr, iterator];
                tickSettingHelperArray = this.renderTickSetting(jIterator, xTicksLen, isBool, xTicks, tickSettingHelperArray);
                xAttr = tickSettingHelperArray[0]; iterator = tickSettingHelperArray[1];
                textProperties = {
                    fontFamily: parentAxisConfigs.fontFamily,
                    fontSize: `${parentAxisConfigs.fontSize}px`,
                    text: parent
                };
                translate = this.renderBackgroundSetting(backgroundSetting, iCounter, gridLinesSetting, xWidth, translate, height);
                this.renderParentAxis(xAttr, parent, textProperties, xWidth);
                iCounter++;
            }
        }

        public renderCategoryParent(iterator, height, width, tickSettings, xAxisParentHeight, xAxisHeight, xScale, gridLinesSetting, textProperties,
            parentAxisConfigs, backgroundSetting, translate) {
            if (!(!Visual.catGroupPresent && Visual.xParentPresent) || (!Visual.xParentPresent)) {
                let xTicks: any;
                xTicks = this.xAxisSvg.selectAll('.boxWhisker_xAxis .tick text');
                const xTicksLen: any = xTicks.size();
                const xParentTicks: string[] = [];
                let isBool: boolean = false;
                let iCounter: number = 0;
                let jIterator: number = 0; iterator = 0;
                this.renderCategoryParentHelper(height, width);
                if (tickSettings.showCategoryTicks && Visual.xParentPresent) {
                    this.xParentAxisSvg.append('line')
                        .classed('boxWhisker_xAxisparentGridLines', true)
                        .attr({
                            stroke: tickSettings.categoryTickColor,
                            'stroke-width': 0.5 + (tickSettings.categoryTickThickness / 100),
                            x1: 1,
                            x2: 1,
                            y1: xAxisParentHeight + 5,
                            y2: 0
                        });

                    this.xParentAxisSvg.append('line')
                        .classed('boxWhisker_xAxisparentGridLines', true)
                        .attr({
                            stroke: tickSettings.categoryTickColor,
                            'stroke-width': 0.5 + (tickSettings.categoryTickThickness / 100),
                            x1: width - 2,
                            x2: width - 2,
                            y1: xAxisParentHeight + 5,
                            y2: 0
                        });
                }
                if (tickSettings.showAxisTicks) {
                    this.xAxisSvg.append('line')
                        .classed('boxWhisker_xAxisGridLines', true)
                        .attr({
                            stroke: tickSettings.color,
                            'stroke-width': 0.25 + (tickSettings.thickness / 133.33),
                            x1: 1,
                            x2: 1,
                            y1: 0,
                            y2: xAxisHeight
                        });
                }
                this.renderCategoryParentHelperTwo(iterator, xTicksLen, isBool, xTicks, jIterator, xScale, tickSettings, xAxisHeight, xAxisParentHeight, gridLinesSetting,
                    height, textProperties, parentAxisConfigs, backgroundSetting, iCounter, translate);
            }
        }

        public renderXVerticalOne(xAxisConfig, xAxisTitleText, widthForXAxis, xAxis, textProperties, xScale, iterator, height, width, tickSettings,
            xAxisParentHeight, xAxisHeight, gridLinesSetting, parentAxisConfigs, backgroundSetting, translate) {
            if (xAxisConfig.show) {
                this.renderXVerticalTitle(xAxisConfig, xAxisTitleText, widthForXAxis);
                this.xAxis.call(xAxis);
                this.renderXVerticalSVG(xAxisConfig, textProperties, xScale);
                // For category Parent
                this.renderCategoryParent(iterator, height, width, tickSettings, xAxisParentHeight, xAxisHeight, xScale, gridLinesSetting, textProperties,
                    parentAxisConfigs, backgroundSetting, translate);

                this.xParentAxisSvg.selectAll('.boxWhisker_xParentAxis text')
                    .style('font-size', `${parentAxisConfigs.fontSize}px`)
                    .style('font-family', parentAxisConfigs.fontFamily)
                    .style('fill', parentAxisConfigs.fontColor);

                this.xAxis.selectAll('path')
                    .remove();

                if (!Visual.catGroupPresent && Visual.xParentPresent) {
                    this.xAxisSvg.selectAll('.boxWhisker_xAxis .tick').append('title')
                        .text((d: string): string => {
                            return d.substring(0, d.indexOf('$$$'));
                        });
                } else {
                    this.xAxisSvg.selectAll('.boxWhisker_xAxis .tick').append('title')
                        .text((d: string): string => {
                            return d.substring(d.indexOf('$$$') >= 0 ? d.indexOf('$$$') + 3 : 0, d.length);
                        });
                }
            } else {
                this.xAxisSvg.selectAll('.boxWhisker_xAxis .tick text').text('');
                this.xAxis.selectAll('path').remove();
            }
        }

        public renderYVerticalOne(gridLinesSetting, width, yAxisConfig, yAxisTitleText, height, textProperties, yAxisFormatter, yAxisWidth, parentAxisConfigs, yParentScale) {
            if (yAxisConfig.show) {
                // Draw Y Axis grid lines
                let yTicks: any;
                yTicks = this.yAxisSvg.selectAll('.boxWhisker_yAxis .tick');
                const tickLeng: any = yTicks.size();
                let start: number = 0;
                if (gridLinesSetting.showAxisGridLines) {
                    for (; start < tickLeng; start++) {

                        const yCoordinate: string = yTicks[0][start]
                            .getAttribute('transform')
                            .substring(12, yTicks[0][start]
                                .getAttribute('transform').length - 1);
                        this.axisGridLines.append('line')
                            .classed('boxWhisker_yAxisGrid', true).attr({
                                stroke: gridLinesSetting.color,
                                'stroke-width': 0.25 + (gridLinesSetting.thickness / 133.33),
                                x1: 1,
                                x2: width - 2,
                                y1: yCoordinate,
                                y2: yCoordinate
                            });
                    }
                }
                const yTitleTextProps: TextProperties = {
                    fontFamily: yAxisConfig.titleFontFamily,
                    fontSize: `${yAxisConfig.titleSize}px`,
                    text: yAxisTitleText
                };
                if (yAxisConfig.showTitle) {
                    this.yTitle
                        .classed('boxWhisker_yTitle', true)
                        .attr('transform', `translate(10,${Visual.margins.top + (height / 2)})`)
                        .append('text')
                        .attr('transform', 'rotate(-90)')
                        .attr('dy', '0.71em')
                        .attr('text-anchor', 'middle')
                        .style('font-size', `${yAxisConfig.titleSize}px`)
                        .style('font-family', yAxisConfig.titleFontFamily)
                        .style('fill', yAxisConfig.titleColor)
                        .text(textMeasurementService.getTailoredTextOrDefault(yTitleTextProps, height))
                        .append('title')
                        .text(yAxisTitleText);
                }

                this.yAxisSvg.selectAll('.boxWhisker_yAxis .tick text')

                    .text((d: string): string => {
                        textProperties = {
                            fontFamily: yAxisConfig.labelsFontFamily,
                            fontSize: `${yAxisConfig.fontSize}px`,
                            text: yAxisFormatter.format(d)
                        };

                        return textMeasurementService.getTailoredTextOrDefault(textProperties, yAxisWidth + 1);
                    });

                //tooltip information adding
                const tooptipFormatter: utils.formatting.IValueFormatter = valueFormatter.create({
                    format: this.measureFormat
                });
                d3.selectAll('.boxWhisker_yAxis .tick text')
                    .append('title')

                    .text((d: string): string => {
                        return tooptipFormatter.format(d);
                    });

                this.yAxisSvg.selectAll('.boxWhisker_yParentAxis .tick text')

                    .text((d: string): string => {
                        textProperties = {
                            fontFamily: parentAxisConfigs.fontFamily,
                            fontSize: `${parentAxisConfigs.fontSize}px`,
                            text: d
                        };

                        return textMeasurementService.getTailoredTextOrDefault(textProperties, yParentScale.rangeBand());
                    })
                    .attr('dy', '0.8em')
                    .attr('x', '0')
                    .attr('y', '0')
                    .style('text-anchor', 'middle')
                    .attr('transform', 'rotate(90)');

                this.yAxis.selectAll('path').remove();
            } else {
                this.yAxisSvg.selectAll('.boxWhisker_yAxis .tick text').text('');
                this.yAxis.selectAll('path').remove();
            }
        }

        public renderBoxVertical(xScale, yScale, rangeConfig, boxOptionsSettings, data, rScale, gradientSelectorSetting, boxWidth) {
            // plotting box below median (Q2)
            const boxesLower: d3.selection.Update<IBoxDataPoints> = this.dotsContainer.selectAll('.boxLower')
                .data(this.boxArray.filter((d: IBoxDataPoints): boolean => d.dataPoints.length > 0));

            if (this.boxOptionsSetting.boxWidth === 'Small') {
                boxWidth /= 2;
            } else if (this.boxOptionsSetting.boxWidth === 'Large') {
                boxWidth *= 1.5;
            }
            boxesLower.enter()
                .append('rect')
                .classed('boxLower', true);

            boxesLower.attr({
                x: (d: IBoxDataPoints): number => xScale(d.updatedXCategoryParent) + xScale.rangeBand() / 2 - boxWidth / 2,
                y: (d: IBoxDataPoints): number => yScale(d.Q2),
                width: (d: IBoxDataPoints): number => boxWidth,
                height: (d: IBoxDataPoints): number => yScale(d.Q1) - yScale(d.Q2),
                fill: this.boxOptionsSetting.boxLowerColor,
                'fill-opacity': (100 - this.boxOptionsSetting.boxTransparency) / 100
            });

            // plotting box above median (Q2)
            const boxesUpper: d3.selection.Update<IBoxDataPoints> = this.dotsContainer.selectAll('.boxUpper')
                .data(this.boxArray.filter((d: IBoxDataPoints): boolean => d.dataPoints.length > 0));

            boxesUpper.enter()
                .append('rect')
                .classed('boxUpper', true);

            boxesUpper.attr({
                x: (d: IBoxDataPoints): number => xScale(d.updatedXCategoryParent) + xScale.rangeBand() / 2 - boxWidth / 2,
                y: (d: IBoxDataPoints): number => yScale(d.Q3),
                width: (d: IBoxDataPoints): number => boxWidth,
                height: (d: IBoxDataPoints): number => yScale(d.Q2) - yScale(d.Q3),
                fill: this.boxOptionsSetting.boxUpperColor,
                'fill-opacity': (100 - this.boxOptionsSetting.boxTransparency) / 100
            });

            if (rangeConfig.dots || boxOptionsSettings.outliers) {
                const boxWhiskerdot: any = this.dotsContainer.selectAll('.boxWhisker_dot');
                let circles: any;

                // filters dots based on whether outliers are disabled or enabled
                if (!boxOptionsSettings.outliers) {
                    circles = boxWhiskerdot.data(data.dataPoints
                        .filter((outlier: IBoxWhiskerViewModel) => outlier.value >= this.boxArray[outlier.key - 1].min
                            && outlier.value <= this.boxArray[outlier.key - 1].max));
                } else if (!rangeConfig.dots) {
                    circles = boxWhiskerdot.data(data.dataPoints
                        .filter((outlier: IBoxWhiskerViewModel) => outlier.value < this.boxArray[outlier.key - 1].min
                            || outlier.value > this.boxArray[outlier.key - 1].max));
                } else {
                    circles =
                        boxWhiskerdot.data(data.dataPoints);
                }

                circles.enter()
                    .append('circle')
                    .classed('boxWhisker_dot', true);

                circles.attr({
                    cx: (d: IBoxWhiskerViewModel): number => xScale(d.updatedXCategoryParent) + xScale.rangeBand() / 2,
                    cy: (d: IBoxWhiskerViewModel): number => yScale(d.value),
                    r: (d: IBoxWhiskerViewModel): number => rScale(d.categorySize),
                    'fill-opacity': (100 - rangeConfig.transparency) / 100,
                    stroke: rangeConfig.border ? rangeConfig.borderColor : 'none',
                    'stroke-opacity': (100 - rangeConfig.transparency) / 100,
                    'stroke-width': 2
                });

                // Gradient logic
                if (!Visual.isGradientPresent) {
                    circles.attr({ fill: (d: IBoxWhiskerViewModel): string => boxWhiskerUtils.getColor(rangeConfig, d) });
                } else {
                    let minGradientValue: number = 9999999999999;
                    let maxGradientValue: number = 0;

                    this.categoryColorData.forEach((element: any) => {
                        if (parseFloat(element) < minGradientValue) {
                            minGradientValue = element;
                        }
                        if (parseFloat(element) > maxGradientValue) {
                            maxGradientValue = element;
                        }
                    });
                    const colorScale: d3.scale.Linear<number, number> = d3.scale.linear()
                        .domain([minGradientValue, maxGradientValue])
                        .range([0, 1]);
                    const colors: (t: number) => string = d3.interpolateRgb(gradientSelectorSetting.minColor,
                        gradientSelectorSetting.maxColor);
                    circles.attr('fill', (d: IBoxWhiskerViewModel): string => {
                        return colors(colorScale(parseFloat(d.categoryColor)));
                    });
                }
            }
            return boxWidth;
        }

        public renderVerticalQuartile(xScale, boxWidth, yScale) {
            // plotting Q1
            const lineQ1: d3.selection.Update<IBoxDataPoints> = this.dotsContainer.selectAll('.boxOutlineQ1')
                .data(this.boxArray.filter((d: IBoxDataPoints): boolean => d.dataPoints.length > 0));

            lineQ1.enter()
                .append('line')
                .classed('boxOutlineQ1', true);

            lineQ1.attr({
                stroke: this.boxOptionsSetting.whiskerColor,
                'stroke-width': 2,
                'stroke-opacity': (100 - this.boxOptionsSetting.whiskerTransparency) / 100,
                x1: (d: IBoxDataPoints): number => xScale(d.updatedXCategoryParent) + xScale.rangeBand() / 2 - boxWidth / 2,
                x2: (d: IBoxDataPoints): number => xScale(d.updatedXCategoryParent) + xScale.rangeBand() / 2 + boxWidth / 2,
                y1: (d: IBoxDataPoints): number => yScale(d.Q1),
                y2: (d: IBoxDataPoints): number => yScale(d.Q1)
            });

            // plotting Q3
            const lineQ3: d3.selection.Update<IBoxDataPoints> = this.dotsContainer.selectAll('.boxOutlineQ3')
                .data(this.boxArray.filter((d: IBoxDataPoints): boolean => d.dataPoints.length > 0));

            lineQ3.enter()
                .append('line')
                .classed('boxOutlineQ3', true);

            lineQ3.attr({
                stroke: this.boxOptionsSetting.whiskerColor,
                'stroke-width': 2,
                'stroke-opacity': (100 - this.boxOptionsSetting.whiskerTransparency) / 100,
                x1: (d: IBoxDataPoints): number => xScale(d.updatedXCategoryParent) + xScale.rangeBand() / 2 - boxWidth / 2,
                x2: (d: IBoxDataPoints): number => xScale(d.updatedXCategoryParent) + xScale.rangeBand() / 2 + boxWidth / 2,
                y1: (d: IBoxDataPoints): number => yScale(d.Q3),
                y2: (d: IBoxDataPoints): number => yScale(d.Q3)
            });
        }

        public renderVerticalWhisker(xScale, yScale, boxWidth) {
            // plotting lower whisker (horizontal line)
            const lineMin: d3.selection.Update<IBoxDataPoints> = this.dotsContainer.selectAll('.whiskerMin')
                .data(this.boxArray.filter((d: IBoxDataPoints): boolean => d.dataPoints.length > 0));

            lineMin.enter()
                .append('line')
                .classed('whiskerMin', true);

            lineMin.attr({
                stroke: this.boxOptionsSetting.whiskerColor,
                'stroke-width': 2,
                'stroke-opacity': (100 - this.boxOptionsSetting.whiskerTransparency) / 100,
                x1: (d: IBoxDataPoints): number => xScale(d.updatedXCategoryParent) + xScale.rangeBand() / 2 - boxWidth / 2,
                x2: (d: IBoxDataPoints): number => xScale(d.updatedXCategoryParent) + xScale.rangeBand() / 2 + boxWidth / 2,
                y1: (d: IBoxDataPoints): number => yScale(d.min),
                y2: (d: IBoxDataPoints): number => yScale(d.min)
            });

            // plotting upper whisker (horizontal line)
            const lineMax: d3.selection.Update<IBoxDataPoints> = this.dotsContainer.selectAll('.whiskerMax')
                .data(this.boxArray.filter((d: IBoxDataPoints): boolean => d.dataPoints.length > 0));

            lineMax.enter()
                .append('line')
                .classed('whiskerMax', true);

            lineMax.attr({
                stroke: this.boxOptionsSetting.whiskerColor,
                'stroke-width': 2,
                'stroke-opacity': (100 - this.boxOptionsSetting.whiskerTransparency) / 100,
                x1: (d: IBoxDataPoints): number => xScale(d.updatedXCategoryParent) + xScale.rangeBand() / 2 - boxWidth / 2,
                x2: (d: IBoxDataPoints): number => xScale(d.updatedXCategoryParent) + xScale.rangeBand() / 2 + boxWidth / 2,
                y1: (d: IBoxDataPoints): number => yScale(d.max),
                y2: (d: IBoxDataPoints): number => yScale(d.max)
            });

            // plotting lower whisker (vertical line)
            const lineMinBox: d3.selection.Update<IBoxDataPoints> = this.dotsContainer.selectAll('.whiskerMinBox')
                .data(this.boxArray.filter((d: IBoxDataPoints): boolean => d.dataPoints.length > 0));

            lineMinBox.enter()
                .append('line')
                .classed('whiskerMinBox', true);

            lineMinBox.attr({
                stroke: this.boxOptionsSetting.whiskerColor,
                'stroke-width': 2,
                'stroke-opacity': (100 - this.boxOptionsSetting.whiskerTransparency) / 100,
                x1: (d: IBoxDataPoints): number => xScale(d.updatedXCategoryParent) + xScale.rangeBand() / 2,
                x2: (d: IBoxDataPoints): number => xScale(d.updatedXCategoryParent) + xScale.rangeBand() / 2,
                y1: (d: IBoxDataPoints): number => yScale(d.min),
                y2: (d: IBoxDataPoints): number => yScale(d.Q1)
            });

            // plotting upper whisker (vertical line)
            const lineMaxBox: d3.selection.Update<IBoxDataPoints> = this.dotsContainer.selectAll('.whiskerMaxBox')
                .data(this.boxArray.filter((d: IBoxDataPoints): boolean => d.dataPoints.length > 0));

            lineMaxBox.enter()
                .append('line')
                .classed('whiskerMaxBox', true);

            lineMaxBox.attr({
                stroke: this.boxOptionsSetting.whiskerColor,
                'stroke-width': 2,
                'stroke-opacity': (100 - this.boxOptionsSetting.whiskerTransparency) / 100,
                x1: (d: IBoxDataPoints): number => xScale(d.updatedXCategoryParent) + xScale.rangeBand() / 2,
                x2: (d: IBoxDataPoints): number => xScale(d.updatedXCategoryParent) + xScale.rangeBand() / 2,
                y1: (d: IBoxDataPoints): number => yScale(d.max),
                y2: (d: IBoxDataPoints): number => yScale(d.Q3)
            });
        }

        // plotting mean
        public renderVerticalMean(xScale, yScale) {
            if (this.meanSetting.show) {
                const shapeMean: d3.selection.Update<IBoxDataPoints> = this.dotsContainer.selectAll('.shapeMean')
                    .data(this.boxArray.filter((d: IBoxDataPoints): boolean => d.dataPoints.length > 0));

                let meanWidth: number = xScale.rangeBand() / 16;
                if (this.meanSetting.meanWidth === 'Small') {
                    meanWidth /= 1.5;
                } else if (this.meanSetting.meanWidth === 'Large') {
                    meanWidth *= 1.5;
                }

                if (this.meanSetting.meanShape === 'Circle') {                                              // circular shape

                    shapeMean.enter()
                        .append('circle')
                        .classed('shapeMean', true);

                    shapeMean.attr({
                        cx: (d: IBoxDataPoints): number => xScale(d.updatedXCategoryParent) + xScale.rangeBand() / 2,
                        cy: (d: IBoxDataPoints): number => yScale(d.mean),
                        r: (d: IBoxDataPoints): number => meanWidth,
                        stroke: this.boxOptionsSetting.whiskerColor,
                        'stroke-width': 2,
                        fill: this.meanSetting.meanColor
                    });

                } else if (this.meanSetting.meanShape === 'Square') {                                       // square shape

                    shapeMean.enter()
                        .append('rect')
                        .classed('shapeMean', true);

                    shapeMean.attr({
                        x: (d: IBoxDataPoints): number => xScale(d.updatedXCategoryParent) + xScale.rangeBand() / 2 - meanWidth,
                        y: (d: IBoxDataPoints): number => yScale(d.mean) - meanWidth,
                        width: (d: IBoxDataPoints): number => meanWidth * 2,
                        height: (d: IBoxDataPoints): number => meanWidth * 2,
                        stroke: this.boxOptionsSetting.whiskerColor,
                        'stroke-width': 2,
                        fill: this.meanSetting.meanColor
                    });

                } else {   // triangular shape
                    const arc: any = d3.svg.symbol().type('triangle-down')
                        .size((d: IBoxDataPoints): number => { return 2 * meanWidth * meanWidth; });

                    shapeMean.enter()
                        .append('path')
                        .classed('shapeMean', true);

                    shapeMean.attr({
                        d: arc,
                        transform: (d: IBoxDataPoints): string => {
                            return `translate(${xScale(d.updatedXCategoryParent) + xScale.rangeBand() / 2},
                                    ${yScale(d.mean)})`;
                        },
                        stroke: this.boxOptionsSetting.whiskerColor,
                        'stroke-width': 2,
                        'fill-opacity': this.meanSetting.meanColor,
                        fill: this.meanSetting.meanColor
                    });
                    shapeMean.exit().remove();

                }
            }
        }

        public renderYVerticalTwo(yAxisConfig, yAxisTitleText, measureTextPropertiesForMeasure, yAxisWidth) {
            if (yAxisConfig.show) {
                Visual.margins.left = 0;
                let yTitleHeight: number = 0;
                if (yAxisConfig.showTitle) {
                    const yTitleTextProperties: TextProperties = {
                        fontFamily: yAxisConfig.titleFontFamily,
                        fontSize: `${yAxisConfig.titleSize}px`,
                        text: yAxisTitleText
                    };
                    yTitleHeight = textMeasurementService.measureSvgTextHeight(yTitleTextProperties);
                    Visual.margins.left = yTitleHeight + 10;
                }
                yAxisWidth = textMeasurementService.measureSvgTextWidth(measureTextPropertiesForMeasure) + 10;
                Visual.margins.left += (yAxisWidth);
            } else {
                Visual.margins.left = 2;
            }

            return yAxisWidth;
        }

        public renderXVerticalTwo(xAxisConfig, xAxisTitleText, dimensions, parentAxisConfigs, measureTextPropertiesForMeasure) {
            if (xAxisConfig.show) {
                Visual.margins.bottom = 0;
                let xTitleHeight: number = 0;
                if (xAxisConfig.showTitle) {
                    const xTitleTextProperties: TextProperties = {
                        fontFamily: xAxisConfig.titleFontFamily,
                        fontSize: `${xAxisConfig.titleSize}px`,
                        text: xAxisTitleText
                    };
                    xTitleHeight = textMeasurementService.measureSvgTextHeight(xTitleTextProperties);
                    Visual.margins.bottom = xTitleHeight + 10;
                }
                let measureTextPropertiesForGroup: TextProperties = {
                    fontFamily: xAxisConfig.labelsFontFamily,
                    fontSize: `${xAxisConfig.fontSize}px`,
                    text: 'X'
                };
                dimensions[2] = textMeasurementService.measureSvgTextHeight(measureTextPropertiesForGroup) + 5;
                Visual.margins.bottom += dimensions[2];

                if (Visual.catGroupPresent && Visual.xParentPresent) {
                    measureTextPropertiesForGroup = {
                        fontFamily: parentAxisConfigs.fontFamily,
                        fontSize: `${parentAxisConfigs.fontSize}px`,
                        text: 'X'
                    };
                    dimensions[1] = textMeasurementService.measureSvgTextHeight(measureTextPropertiesForGroup);
                    if (this.parentAxisConfigs.split) {
                        Visual.margins.top = dimensions[1] + 5;
                    } else {
                        Visual.margins.bottom += dimensions[1] + 5;
                        dimensions[0] = textMeasurementService.measureSvgTextHeight(measureTextPropertiesForMeasure);
                        Visual.margins.top = dimensions[0] / 2;
                    }
                } else {
                    dimensions[0] = textMeasurementService.measureSvgTextHeight(measureTextPropertiesForMeasure);
                    Visual.margins.top = dimensions[0] / 2;
                }
            } else {
                dimensions[0] = textMeasurementService.measureSvgTextHeight(measureTextPropertiesForMeasure);
                Visual.margins.top = dimensions[0] / 2;
                Visual.margins.bottom = dimensions[0] / 2;
                dimensions[1] = 0;
            }
            return dimensions;
        }

        public renderVerticalSVG() {
            this.scrollableContainer.style({ 'overflow-x': 'auto', 'overflow-y': 'hidden' });
            if (this.xAxisSvg) {
                this.xAxisSvg.remove();
            }
            if (this.yAxisSvg) {
                this.yAxisSvg.remove();
            }
            if (this.xParentAxisSvg) {
                this.xParentAxisSvg.remove();
            }
            if (this.yParentAxisSvg) {
                this.yParentAxisSvg.remove();
            }
            this.xAxisSvg = this.scrollableContainer.append('svg')
                .classed('boxWhisker_xAxisSvg', true);
            this.xAxis = this.xAxisSvg
                .append('g')
                .classed('boxWhisker_xAxis', true);
            this.yAxisSvg = this.baseContainer.append('svg')
                .classed('boxWhisker_yAxisSvg', true);
            this.yAxis = this.yAxisSvg
                .append('g')
                .classed('boxWhisker_yAxis', true);
            this.yTitle = this.yAxisSvg.append('g')
                .classed('boxWhisker_yAxis boxWhisker_yTitle', true);
            this.xTitle = this.xAxisSvg.append('g')
                .classed('boxWhisker_xAxis boxWhisker_xTitle', true);
            this.xParentAxisSvg = this.scrollableContainer.append('svg')
                .classed('boxWhisker_xParentAxisSvg', true);
            this.xParentAxis = this.xParentAxisSvg
                .append('g')
                .classed('boxWhisker_xParentAxis', true);
        }

        // Scroll logic
        public renderScrollLogic(minWidth, width, height, xAxisPoints, xScale, yScale, xAxisHeight, widthForXAxis, options, heightForXAxis) {

            if ((minWidth * xAxisPoints) > (width)) {
                width = (minWidth * xAxisPoints);
                height = height - 20 < 0 ? 0 : height - 20;
                xScale.rangeBands([0, width - 2]);
                yScale.range([height, 0]);
                this.svg.attr({
                    width: width,
                    height: height
                });
                this.xParentAxisSvg.attr({
                    width: width
                });
                if (!this.parentAxisConfigs.split) {
                    this.xParentAxisSvg.style('margin-top', `${height + xAxisHeight + Visual.margins.top}px`);
                }
                this.xAxisSvg.style({
                    'margin-top': `${height + Visual.margins.top}px`
                });
                this.xAxisSvg.attr({
                    width: width,
                    height: Visual.margins.bottom
                });
            }
            this.scrollableContainer.style('width', `${((widthForXAxis) / options.viewport.width) * 100}%`);
            this.scrollableContainer
                .style('height', `${((heightForXAxis + Visual.margins.bottom + Visual.margins.top) / options.viewport.height) * 100}%`);
            this.scrollableContainer.style('margin-left', `${Visual.margins.left}px`);
        }

        public renderYVerticalThree(yAxisConfig, yAxis, yAxisFormatter) {
            if (yAxisConfig.show) {
                yAxis.tickFormat(yAxisFormatter.format);
                this.yAxis.attr('transform', `translate(${Visual.margins.left},${Visual.margins.top})`)
                    .call(yAxis);

                this.yAxisSvg.selectAll('.boxWhisker_yAxis text')
                    .style('font-size', `${yAxisConfig.fontSize}px`)
                    .style('font-family', yAxisConfig.labelsFontFamily)
                    .style('fill', yAxisConfig.fontColor);

                this.yAxisSvg.selectAll('.boxWhisker_yAxis .tick').append('title')

                    .text((d: string) => {
                        return d;
                    });
            }
        }

        // calcualte minimum width for X-Axis labels
        public calculateMinWidth(xAxisConfig, minWidth) {
            if (xAxisConfig.minWidth || xAxisConfig.minWidth === 0) {
                if (xAxisConfig.minWidth > 300) {
                    xAxisConfig.minWidth = 300;
                    minWidth = 300;
                } else if (xAxisConfig.minWidth < 5) {
                    xAxisConfig.minWidth = 5;
                    minWidth = 5;
                } else {
                    minWidth = xAxisConfig.minWidth;
                }
            }
            return minWidth;
        }

        public updateVerticalDomain(yAxisConfig, domain) {
            if (yAxisConfig.start || yAxisConfig.start === 0) {
                if (yAxisConfig.end || yAxisConfig.end === 0) {
                    if (yAxisConfig.start < yAxisConfig.end) {
                        domain[0] = yAxisConfig.start;
                    }
                } else if (yAxisConfig.start < domain[1]) {
                    domain[0] = yAxisConfig.start;
                }
            }
            if (yAxisConfig.end || yAxisConfig.end === 0) {
                if (yAxisConfig.start || yAxisConfig.start === 0) {
                    if (yAxisConfig.start < yAxisConfig.end) {
                        domain[1] = yAxisConfig.end;
                    }
                } else if (yAxisConfig.end > domain[0]) {
                    domain[1] = yAxisConfig.end;
                }
            }
            return domain;
        }

        public xParentAdjustment(xAxisParentHeight, height, options, xAxisHeight) {
            // X Axis parent adjustment
            if (this.parentAxisConfigs.split) {
                this.xParentAxisSvg.attr({
                    width: '100%',
                    height: `${((xAxisParentHeight + 5) / (height + Visual.margins.bottom)) * 100}%`
                });
            } else {
                this.xParentAxisSvg.attr({
                    width: '100%',
                    height: `${((xAxisParentHeight + 5) / (options.viewport.height + Visual.margins.bottom)) * 100}%`
                });
                this.xParentAxisSvg.style('margin-top', `${height + xAxisHeight + Visual.margins.top}px`);
            }
        }

        public updateFlipVertical(xAxisConfig, yAxisFormatter, format, xAxisTitleText, xAxisParentHeight, yAxisConfig,
            yParentScale, yAxisTitleText, yAxisWidth, options, parentAxisConfigs, width, height, originalSvgHeight,
            xScale, yScale, data, rScale, dataSizeValues, rangeMin, rangeMax, iterator, translate, tickSettings,
            gridLinesSetting, backgroundSetting, boxOptionsSettings, rangeConfig, gradientSelectorSetting) {

            let xAxisHeight: number = 0;
            Visual.margins.right = 0;
            Visual.margins.top = 0;
            this.renderVerticalSVG();
            let measureTextHeight: number;
            let domainStart: number = boxWhiskerUtils.returnMin(Visual.dataValues);
            let domainEnd: number = boxWhiskerUtils.returnMax(Visual.dataValues);
            let domain: any = [domainStart, domainEnd];
            domain = this.updateVerticalDomain(yAxisConfig, domain);
            domainStart = domain[0]; domainEnd = domain[1];
            const value: number =
                Math.abs(domainEnd) > Math.abs(domainStart) ? Math.abs(domainEnd) : Math.abs(domainStart);
            let decimalPlaces: number = 0;
            if (yAxisConfig.decimalPlaces || yAxisConfig.decimalPlaces === 0) {
                if (yAxisConfig.decimalPlaces > 4) {
                    yAxisConfig.decimalPlaces = 4;
                    decimalPlaces = yAxisConfig.decimalPlaces;
                } else if (yAxisConfig.decimalPlaces < 0) {
                    yAxisConfig.decimalPlaces = null;
                } else {
                    decimalPlaces = yAxisConfig.decimalPlaces;
                }
            }
            yAxisFormatter = valueFormatter.create({
                format: format, precision: decimalPlaces, value: yAxisConfig.displayUnits === 0 ?
                    boxWhiskerUtils.getValueUpdated(value) : yAxisConfig.displayUnits
            });
            const formattedMaxMeasure: string = yAxisFormatter.format(value);
            const measureTextPropertiesForMeasure: TextProperties = {
                fontFamily: yAxisConfig.labelsFontFamily,
                fontSize: `${yAxisConfig.fontSize}px`,
                text: formattedMaxMeasure
            };
            yAxisWidth = this.renderYVerticalTwo(yAxisConfig, yAxisTitleText, measureTextPropertiesForMeasure, yAxisWidth);
            let dimensions: any = [measureTextHeight, xAxisParentHeight, xAxisHeight];
            dimensions = this.renderXVerticalTwo(xAxisConfig, xAxisTitleText, dimensions, parentAxisConfigs, measureTextPropertiesForMeasure);
            measureTextHeight = dimensions[0]; xAxisParentHeight = dimensions[1]; xAxisHeight = dimensions[2];
            // Svg adjustment
            width = width - Visual.margins.left < 0 ? 0 : width - Visual.margins.left;
            height = (height - Visual.margins.bottom - Visual.margins.top) < 0 ?
                0 : height - Visual.margins.bottom - Visual.margins.top;
            this.svg.attr('width', '100%');
            this.svg.attr('height', `${(height / originalSvgHeight) * 100}%`);
            this.svg.style('margin-top', `${Visual.margins.top}px`);
            this.svg.style('margin-left', '0px');
            // Y Axis adjustment
            this.yAxisSvg.attr({
                width: `${(Visual.margins.left / options.viewport.width) * 100}%`,
                height: `100%`
            });
            // X Axis adjustment
            this.xAxisSvg.attr({
                width: `100%`,
                height: `${(Visual.margins.bottom / originalSvgHeight) * 100}%`
            });
            this.xAxisSvg.style('margin-top', `${height + Visual.margins.top}px`);
            this.xParentAdjustment(xAxisParentHeight, height, options, xAxisHeight);
            // Scales
            yScale = d3.scale.linear()
                .domain([domainStart, domainEnd])
                .range([height, 0]);
            xScale = d3.scale.ordinal()
                .domain(data.dataPoints.map((d: IBoxWhiskerViewModel) => d.updatedXCategoryParent))
                .rangeBands([0, width - 2]);
            rScale = d3.scale.linear()
                .domain([boxWhiskerUtils.returnMin(dataSizeValues), (boxWhiskerUtils.returnMax(dataSizeValues))])
                .range([rangeMin, rangeMax]);
            const widthForXAxis: number = width;
            const heightForXAxis: number = height;
            let textProperties: TextProperties = {
                fontFamily: xAxisConfig.labelsFontFamily,
                fontSize: `${xAxisConfig.fontSize}px`,
                text: this.catLongestText
            };
            const xAxisPoints: number = data.dataPoints.map((d: IBoxWhiskerViewModel) => d.updatedXCategoryParent)
                .filter(boxWhiskerUtils.getDistinctElements).length;
            let minWidth: number = 30;
            minWidth = this.calculateMinWidth(xAxisConfig, minWidth);
            this.renderScrollLogic(minWidth, width, height, xAxisPoints, xScale, yScale, xAxisHeight, widthForXAxis, options, heightForXAxis);
            const xAxis: d3.svg.Axis = d3.svg.axis().scale(xScale).orient('bottom');
            const yAxis: d3.svg.Axis = d3.svg.axis().scale(yScale)
                .ticks(axis.getRecommendedNumberOfTicksForYAxis(height - Visual.margins.bottom - Visual.margins.top)).orient('left');
            this.renderYVerticalThree(yAxisConfig, yAxis, yAxisFormatter);
            this.xAxis.selectAll('.boxWhisker_xAxisGridLines').remove();
            this.renderXVerticalOne(xAxisConfig, xAxisTitleText, widthForXAxis, xAxis, textProperties, xScale, iterator, height, width, tickSettings,
                xAxisParentHeight, xAxisHeight, gridLinesSetting, parentAxisConfigs, backgroundSetting, translate);
            this.renderYVerticalOne(gridLinesSetting, width, yAxisConfig, yAxisTitleText, height, textProperties, yAxisFormatter, yAxisWidth, parentAxisConfigs, yParentScale);
            // plotting boxes, whiskers, median lines
            let boxWidth: number = xScale.rangeBand() / 2;
            boxWidth = this.renderBoxVertical(xScale, yScale, rangeConfig, boxOptionsSettings, data, rScale, gradientSelectorSetting, boxWidth);
            this.renderVerticalQuartile(xScale, boxWidth, yScale);
            this.renderVerticalWhisker(xScale, yScale, boxWidth);
            this.renderVerticalMean(xScale, yScale);
        }

        public caseZeroLegendDotHelper(dimensions, isScrollPresent, legendHeight, options) {
            if (isScrollPresent) {
                if (Visual.isColorCategoryPresent && Visual.catSizePresent) {
                    this.legendDotSvg.attr({
                        height: legendHeight,
                        width: options.viewport.width
                    });
                    dimensions[0] = dimensions[0] - legendHeight <= 1 ? 1 : dimensions[0] - legendHeight;
                    this.legendDotSvg
                        .style({ 'margin-top': `${legendHeight}px`, 'margin-left': '0' });

                    this.baseContainer.style('margin-top', `${legendHeight * 2}px`);
                } else {
                    this.legendDotSvg
                        .style({ 'margin-left': '0' });
                    this.baseContainer.style('margin-top', `${legendHeight}px`);
                }
            } else {
                this.legendDotSvg.attr({
                    height: legendHeight,
                    width: options.viewport.width / 2
                });
                this.legendDotSvg.style({ 'margin-top': 0, 'margin-left': `${options.viewport.width / 2}px` });
            }
        }

        public caseOneLegendDotHelper(dimensions, isScrollPresent, legendHeight, legendContainer, options) {
            if (isScrollPresent) {
                if (Visual.isColorCategoryPresent && Visual.catSizePresent) {
                    this.legendDotSvg.attr({
                        height: legendHeight,
                        width: options.viewport.width
                    });
                    dimensions[0] = dimensions[0] - legendHeight <= 1 ? 1 : dimensions[0] - legendHeight;
                    this.legendDotSvg
                        .style({ 'margin-top': legendContainer.style('margin-top'), 'margin-left': '0px' });
                    legendContainer.style('margin-top', `${dimensions[0]}px`);
                } else {
                    this.legendDotSvg
                        .style({ 'margin-top': legendContainer.style('margin-top'), 'margin-left': '0px' });
                }
            } else {
                this.legendDotSvg.attr({
                    height: legendHeight,
                    width: options.viewport.width / 2
                });
                this.legendDotSvg
                    .style({
                        'margin-top': legendContainer
                            .style('margin-top'), 'margin-left': `${options.viewport.width / 2}px`
                    });
            }
        }

        public caseThreeLegendDotHelper(isScrollPresent, legendWidth, options) {
            if (isScrollPresent) {
                this.legendDotSvg.attr({
                    width: 0,
                    height: 0
                });
            } else {
                this.legendDotSvg.attr({
                    width: legendWidth,
                    height: options.viewport.height / 2
                });
                this.legendDotSvg
                    .style({ 'margin-top': `${options.viewport.height / 2}px`, 'margin-left': 0 });
            }
        }

        public caseTwoLegendDotHelper(dimensions, isScrollPresent, legendWidth, options) {
            if (isScrollPresent) {
                this.legendDotSvg.attr({ width: 0, height: 0 });
            } else {
                this.legendDotSvg.attr({
                    width: legendWidth,
                    height: options.viewport.height / 2
                });
                this.legendDotSvg
                    .style({ 'margin-top': `${options.viewport.height / 2}px`, 'margin-left': `${dimensions[1]}px` });
            }
        }

        // Position chart, legends, boxWhisker legends according to legend position.
        public legendPositionUpdate(dimensions, legendSetting, legendOrient, legendHeight, isScrollPresent, options, legendContainer, legendWidth, legendGroupContainer) {
            if (Visual.isColorCategoryPresent && !Visual.isGradientPresent) {
                legendGroupContainer.selectAll('*').style('display', 'block');
            } else {
                legendGroupContainer.selectAll('*').style('display', 'none');
            }

            if (legendSetting.show) {
                switch (legendOrient) {
                    case 0:
                        dimensions[0] = dimensions[0] - legendHeight <= 1 ? 1 : dimensions[0] - legendHeight;
                        this.caseZeroLegendDotHelper(dimensions, isScrollPresent, legendHeight, options);
                        this.baseContainer.style('height', `${dimensions[0]}px`);
                        this.baseContainer.style('width', `${dimensions[1]}px`);
                        break;
                    case 1:
                        dimensions[0] = dimensions[0] - legendHeight <= 1 ? 1 : dimensions[0] - legendHeight;
                        this.caseOneLegendDotHelper(dimensions, isScrollPresent, legendHeight, legendContainer, options);
                        this.baseContainer.style('height', `${dimensions[0]}px`);
                        this.baseContainer.style('width', `${dimensions[1]}px`);
                        break;
                    case 3:
                        dimensions[1] = dimensions[1] - legendWidth <= 0 ? 0 : dimensions[1] - legendWidth;
                        dimensions[0] = dimensions[0] <= 1 ? 1 : dimensions[0];
                        this.caseThreeLegendDotHelper(isScrollPresent, legendWidth, options);
                        this.baseContainer.style('height', `${dimensions[0]}px`);
                        this.baseContainer.style('width', `${dimensions[1]}px`);
                        break;
                    case 2:
                        dimensions[1] = dimensions[1] - legendWidth <= 0 ? 0 : dimensions[1] - legendWidth;
                        dimensions[0] = dimensions[0] <= 1 ? 1 : dimensions[0];
                        this.caseTwoLegendDotHelper(dimensions, isScrollPresent, legendWidth, options);
                        this.baseContainer.style('height', `${dimensions[0]}px`);
                        this.baseContainer.style('width', `${dimensions[1]}px`);
                        break;
                    default:
                }
            }
            return dimensions;
        }

        public calculateMedian(dataPointsLength, iterator, mid, counter) {
            // the following code snippet calculates the medians (Q1, Q2 and Q3)
            if (dataPointsLength === 1) {
                this.boxArray[iterator].Q2 = this.boxArray[iterator].dataPoints[0];
                this.boxArray[iterator].Q1 = this.boxArray[iterator].dataPoints[0];
                this.boxArray[iterator].Q3 = this.boxArray[iterator].dataPoints[0];
            } else if (dataPointsLength % 2 === 0 || this.boxOptionsSetting.median === 'Inclusive') {
                mid = dataPointsLength / 2 - 1;
                this.boxArray[iterator].Q2 = boxWhiskerUtils.getMedian(this.boxArray[iterator], 0, dataPointsLength - 1);
                this.boxArray[iterator].Q1 = boxWhiskerUtils.getMedian(this.boxArray[iterator], 0, Math.ceil(mid));
                this.boxArray[iterator].Q3 = boxWhiskerUtils.getMedian(this.boxArray[iterator], Math.floor(mid + 1), dataPointsLength - 1);
            } else {
                mid = (dataPointsLength - 1) / 2;
                this.boxArray[iterator].Q2 = boxWhiskerUtils.getMedian(this.boxArray[iterator], 0, dataPointsLength - 1);
                this.boxArray[iterator].Q1 = boxWhiskerUtils.getMedian(this.boxArray[iterator], 0, mid - 1);
                this.boxArray[iterator].Q3 = boxWhiskerUtils.getMedian(this.boxArray[iterator], mid + 1, dataPointsLength - 1);
            }
            // calculating IQR
            this.boxArray[iterator].IQR = this.boxArray[iterator].Q3 - this.boxArray[iterator].Q1;
            // calculating mean
            for (counter = 0; counter < dataPointsLength; counter++) {
                this.boxArray[iterator].mean += this.boxArray[iterator].dataPoints[counter];
            }
            this.boxArray[iterator].mean /= dataPointsLength;
        }

        public renderBoxHelper(dataPointsLength, i) {
            if (this.boxOptionsSetting.higher > 100) {
                this.boxOptionsSetting.higher = 100;
            }
            if (this.boxOptionsSetting.higher < 75) {
                this.boxOptionsSetting.higher = 75;
            }
            if (this.boxOptionsSetting.lower > 25) {
                this.boxOptionsSetting.lower = 25;
            }
            if (this.boxOptionsSetting.lower < 0) {
                this.boxOptionsSetting.lower = 0;
            }
            const lowerIndex: number = this.boxOptionsSetting.lower / 100 * (dataPointsLength + 1);
            const higherIndex: number = this.boxOptionsSetting.higher / 100 * (dataPointsLength + 1);
            const lowerIndexRounded: number = Math.floor(lowerIndex);
            const higherIndexRounded: number = Math.floor(higherIndex);

            if (dataPointsLength === 1 || dataPointsLength === 2) {
                this.boxArray[i].min = this.boxArray[i].Q1;
                this.boxArray[i].max = this.boxArray[i].Q3;
            } else if (higherIndexRounded >= dataPointsLength || lowerIndexRounded === 0) {

                if (higherIndexRounded >= dataPointsLength && lowerIndexRounded === 0) {
                    this.boxArray[i].min = this.boxArray[i].dataPoints[0];
                    this.boxArray[i].max = this.boxArray[i].dataPoints[dataPointsLength - 1];
                } else if (lowerIndexRounded === 0) {
                    this.boxArray[i].min = this.boxArray[i].dataPoints[0];

                    this.boxArray[i].max = this.boxArray[i].dataPoints[higherIndexRounded - 1] + (higherIndex - higherIndexRounded)
                        * (this.boxArray[i].dataPoints[higherIndexRounded] - this.boxArray[i].dataPoints[higherIndexRounded - 1]);
                    this.boxArray[i].max = Math.max(this.boxArray[i].max, this.boxArray[i].Q3);
                } else {
                    this.boxArray[i].min = this.boxArray[i].dataPoints[lowerIndexRounded - 1] + (lowerIndex - lowerIndexRounded) *
                        (this.boxArray[i].dataPoints[lowerIndexRounded] - this.boxArray[i].dataPoints[lowerIndexRounded - 1]);
                    this.boxArray[i].min = Math.min(this.boxArray[i].min, this.boxArray[i].Q1);

                    this.boxArray[i].max = this.boxArray[i].dataPoints[dataPointsLength - 1];
                }

            } else {

                this.boxArray[i].min = this.boxArray[i].dataPoints[lowerIndexRounded - 1] + (lowerIndex - lowerIndexRounded) *
                    (this.boxArray[i].dataPoints[lowerIndexRounded] - this.boxArray[i].dataPoints[lowerIndexRounded - 1]);
                this.boxArray[i].min = Math.min(this.boxArray[i].min, this.boxArray[i].Q1);

                this.boxArray[i].max = this.boxArray[i].dataPoints[higherIndexRounded - 1] + (higherIndex - higherIndexRounded) *
                    (this.boxArray[i].dataPoints[higherIndexRounded] - this.boxArray[i].dataPoints[higherIndexRounded - 1]);
                this.boxArray[i].max = Math.max(this.boxArray[i].max, this.boxArray[i].Q3);

            }
        }

        public renderBoxTooltip(options, i) {
            // formatting and adding tooltip data for boxes
            const formatter: utils.formatting.IValueFormatter = valueFormatter.create({
                format: options.dataViews[0].categorical.values[0].source.format
                    ? options.dataViews[0].categorical.values[0].source.format : valueFormatter.DefaultNumericFormat
            });
            this.boxArray[i].tooltipData = [
                {
                    name: 'Median Type',
                    value: boxWhiskerUtils.convertToString(this.boxOptionsSetting.median)
                },
                {
                    name: 'Whisker Type',
                    value: boxWhiskerUtils.convertToString(this.boxOptionsSetting.whiskerType)
                },
                {
                    name: 'Mean',
                    value: formatter.format(this.boxArray[i].mean)
                },
                {
                    name: 'Quartile 1',
                    value: formatter.format(this.boxArray[i].Q1)
                },
                {
                    name: 'Median',
                    value: formatter.format(this.boxArray[i].Q2)
                },
                {
                    name: 'Quartile 3',
                    value: formatter.format(this.boxArray[i].Q3)
                },
                {
                    name: 'Maximum',
                    value: formatter.format(Math.max(...this.boxArray[i].dataPoints))
                },
                {
                    name: 'Minimum',
                    value: formatter.format(Math.min(...this.boxArray[i].dataPoints))
                },
                {
                    name: 'IQR',
                    value: formatter.format(this.boxArray[i].IQR)
                },
                {
                    name: 'Upper Whisker',
                    value: formatter.format(this.boxArray[i].max)
                },
                {
                    name: 'Lower Whisker',
                    value: formatter.format(this.boxArray[i].min)
                }
            ];
        }

        // box calculations
        public renderBox(iterator, boxArraylength, options) {

            for (; iterator < boxArraylength; iterator++) {
                const dataPointsLength: number = this.boxArray[iterator].dataPoints.length;
                let mid: number;
                let counter: number;
                this.boxArray[iterator].dataPoints = this.boxArray[iterator].dataPoints.sort((a: number, b: number): number => a - b);

                // the following code snippet calculates the medians (Q1, Q2 and Q3)   
                this.calculateMedian(dataPointsLength, iterator, mid, counter);

                // the following code snippet calculates the upper and lower whisker values for each whisker type
                if (this.boxOptionsSetting.whiskerType === 'Min/Max') {
                    // for 'Min/Max' whisker type
                    this.boxArray[iterator].min = this.boxArray[iterator].dataPoints[0];
                    this.boxArray[iterator].max = this.boxArray[iterator].dataPoints[dataPointsLength - 1];
                } else if (this.boxOptionsSetting.whiskerType === '< 1.5 IQR') {
                    // for '< 1.5 IQR' whisker type
                    this.boxArray[iterator].min = this.boxArray[iterator].dataPoints
                        .filter((min: number) => min >= (this.boxArray[iterator].Q1 - (1.5 * this.boxArray[iterator].IQR)))[0];
                    this.boxArray[iterator].max = this.boxArray[iterator].dataPoints
                        .filter((max: number) => max <= (this.boxArray[iterator].Q3 + (1.5 * this.boxArray[iterator].IQR))).reverse()[0];
                } else if (this.boxOptionsSetting.whiskerType === '= 1.5 IQR') {
                    // for '= 1.5 IQR' whisker type
                    this.boxArray[iterator].min = this.boxArray[iterator].Q1 - (1.5 * this.boxArray[iterator].IQR);
                    this.boxArray[iterator].max = this.boxArray[iterator].Q3 + (1.5 * this.boxArray[iterator].IQR);
                } else if (this.boxOptionsSetting.whiskerType === 'One Standard Deviation') {
                    // for 'One Standard Deviation' whisker type
                    let sigma: number = 0;
                    for (counter = 0; counter < dataPointsLength; counter++) {
                        sigma += Math.pow(this.boxArray[iterator].dataPoints[counter] - this.boxArray[iterator].mean, 2);
                    }
                    sigma /= (dataPointsLength - 1);
                    sigma = Math.sqrt(sigma);
                    this.boxArray[iterator].min = this.boxArray[iterator].mean - sigma;
                    this.boxArray[iterator].min = Math.min(this.boxArray[iterator].min, this.boxArray[iterator].Q1);
                    this.boxArray[iterator].max = this.boxArray[iterator].mean + sigma;
                    this.boxArray[iterator].max = Math.max(this.boxArray[iterator].max, this.boxArray[iterator].Q3);
                } else {
                    // for 'Custom' whisker type
                    this.renderBoxHelper(dataPointsLength, iterator);
                }
                // box calculations
                // formatting and adding tooltip data for boxes
                this.renderBoxTooltip(options, iterator);
            }
        }

        // Update Min/Max for radius scale
        public updateRadiusScale(rangeConfig, range) {
            if (rangeConfig.min || rangeConfig.min === 0) {
                if (rangeConfig.min > 10) {
                    rangeConfig.min = 10;
                    range[1] = 10;
                } else if (rangeConfig.min < 1) {
                    rangeConfig.min = 1;
                    range[1] = 1;
                } else {
                    range[1] = rangeConfig.min;
                }
            }
            if (rangeConfig.max || rangeConfig.max === 0) {
                if (rangeConfig.max > 50) {
                    rangeConfig.max = 50;
                    range[0] = 50;
                } else if (rangeConfig.max < 1) {
                    rangeConfig.max = 1;
                    range[0] = 1;
                } else {
                    range[0] = rangeConfig.max;
                }
                if (rangeConfig.max < rangeConfig.min) {
                    rangeConfig.max = rangeConfig.min;
                    range[0] = range[1];
                }
            }
            return range;
        }

        public updateFlipSetting(flipSetting, xAxisConfig, xAxisFormatter, format, xAxisTitleText, xAxisParentHeight, yAxisConfig,
            yAxisHeight, yAxisTitleText, yAxisWidth, parentAxisConfigs, width, height, originalSvgHeight,
            originalSvgWidth, xScale, yScale, data, rScale, dataSizeValues, rangeMin, rangeMax, iterator, translate, tickSettings,
            gridLinesSetting, backgroundSetting, boxOptionsSettings, rangeConfig, gradientSelectorSetting, yAxisFormatter, yParentScale, options) {
            if (flipSetting.orient === 'horizontal') {

                this.updateFlipHorizontal(xAxisConfig, format, xAxisTitleText, yAxisConfig, yAxisTitleText, flipSetting,
                    parentAxisConfigs, originalSvgHeight, originalSvgWidth, data, dataSizeValues, rangeMin, rangeMax, iterator, tickSettings,
                    gridLinesSetting, backgroundSetting, boxOptionsSettings, rangeConfig, gradientSelectorSetting, translate,
                    xAxisFormatter, xAxisParentHeight, yAxisHeight, yAxisWidth, width, height, xScale, yScale, rScale);

            } else {
                this.updateFlipVertical(xAxisConfig, yAxisFormatter, format, xAxisTitleText, xAxisParentHeight, yAxisConfig,
                    yParentScale, yAxisTitleText, yAxisWidth, options, parentAxisConfigs, width, height, originalSvgHeight,
                    xScale, yScale, data, rScale, dataSizeValues, rangeMin, rangeMax, iterator, translate, tickSettings,
                    gridLinesSetting, backgroundSetting, boxOptionsSettings, rangeConfig, gradientSelectorSetting);
            }
        }

        public updateLegendHelper(legendSetting, legendOrient, isScrollPresent, options) {
            if (legendSetting.show && (Visual.isColorCategoryPresent || Visual.catSizePresent)) {
                switch (legendOrient) {
                    case 0:
                    case 1:
                        isScrollPresent = d3.select('.navArrow')[0][0] ||
                            ((options.viewport.width / 2) < 200 * (legendSetting.fontSize / 10)) ? true : false;
                        break;
                    case 2:
                    case 3:
                        isScrollPresent = d3.select('.navArrow')[0][0] ||
                            ((options.viewport.height / 2) < 200 * (legendSetting.fontSize / 10)) ? true : false;
                        break;
                    default:
                }
            }
        }

        public updateSVG() {
            this.svg.selectAll('.boxWhisker_xAxisGrid').remove();
            this.svg.selectAll('.boxWhisker_yAxisGrid').remove();
            this.svg.selectAll('.boxWhisker_xAxisGridLines').remove();
            this.svg.selectAll('.boxWhisker_yAxisGridLines').remove();
            this.svg.selectAll('.boxWhisker_dot').remove();
            this.svg.selectAll('.boxWhisker_xAxisGridRect').remove();
            this.svg.selectAll('.boxLower').remove();
            this.svg.selectAll('.boxUpper').remove();
            this.svg.selectAll('.boxOutlineQ1').remove();
            this.svg.selectAll('.boxOutlineQ3').remove();
            this.svg.selectAll('.whiskerMin').remove();
            this.svg.selectAll('.whiskerMax').remove();
            this.svg.selectAll('.whiskerMinBox').remove();
            this.svg.selectAll('.whiskerMaxBox').remove();
            this.svg.selectAll('.shapeMean').remove();
        }

        public renderHelper(data) {
            if (data === null) {
                this.xAxisSvg.remove();
                this.yAxisSvg.remove();
                this.yParentAxisSvg.remove();
                this.xParentAxisSvg.remove();
                this.yAxis.remove();
                this.xAxis.remove();
            }
        }

        public update(options: VisualUpdateOptions): void {
            try {
                this.events.renderingStarted(options);
                this.colorPalette = this.host.colorPalette;
                if (!options) { return; }
                this.viewport = options.viewport;
                const dataView: DataView = this.dataView = options.dataViews && options.dataViews[0] ? options.dataViews[0] : null;
                const sortSetting: ISortSettings = this.sortSetting = boxWhiskerSettings.getSortSettings(dataView);
                const data: IBoxWhiskerDataPoints = this.data = this.visualTransform(
                    options, dataView, this.viewport.height, this.colorPalette, this.host);
                this.renderHelper(data);
                const visualContext: this = this;
                Visual.dataValues = [];
                data.dataPoints.forEach((d: IBoxWhiskerViewModel): void => {
                    Visual.dataValues.push(d.value);
                });
                Visual.xTitleText = data.xTitleText;
                Visual.yTitleText = data.yTitleText;
                const flipSetting: IFlipSettings = this.flipSetting = boxWhiskerSettings.getFlipSettings(dataView);
                const yAxisConfig: IAxisSettings = this.yAxisConfig = boxWhiskerSettings.getAxisSettings(this.dataView, 'Y');
                const xAxisConfig: IAxisSettings = this.xAxisConfig = boxWhiskerSettings.getAxisSettings(this.dataView, 'X');
                const rangeConfig: IRangeSettings = this.rangeConfig = boxWhiskerSettings.getRangeSettings(dataView);
                const legendSetting: ILegendConfig = this.legendSetting = boxWhiskerSettings.getLegendSettings(dataView);
                const parentAxisConfigs: IParentAxisSettings = this.parentAxisConfigs = boxWhiskerSettings.getParentAxisSettings(this.dataView);
                const gradientSelectorSetting: IGradientSelectorSettings = this.gradientSetting = boxWhiskerSettings.getGradientSelectorSettings(this.dataView);
                const backgroundSetting: IBackgroundSettings = this.backgroundSetting = boxWhiskerSettings.getBackgroundSettings(this.dataView);
                const gridLinesSetting: IGridLinesSettings = this.gridLinesSetting = boxWhiskerSettings.getGridLinesSettings(this.dataView);
                const tickSettings: ITickSettings = this.tickSetting = boxWhiskerSettings.getTickSettings(this.dataView);
                const boxOptionsSettings: IBoxOptionsSettings = this.boxOptionsSetting = boxWhiskerSettings.getBoxOptionsSettings(this.dataView);
                const meanSettings: IMeanSettings = this.meanSetting = boxWhiskerSettings.getMeanSettings(this.dataView);
                let width: number = _.clone(options.viewport.width), height: number = _.clone(options.viewport.height);
                const dataSizeValues: number[] = [];
                data.dataPoints.forEach((d: IBoxWhiskerViewModel): void => { dataSizeValues.push(d.categorySize); });
                let legendWidth: number = 0, legendHeight: number = 0;// Legends
                let isScrollPresent: boolean = false, dimensions: any = [height, width];
                const legendContainer: d3.Selection<HTMLElement> = d3.select('.legend');
                const legendGroupContainer: d3.Selection<HTMLElement> = d3.select('.legend #legendGroup');
                if (legendSetting.show) {
                    this.renderLegend(dataView, legendSetting, true);
                    legendWidth = parseFloat(legendContainer.attr('width'));
                    legendHeight = parseFloat(legendContainer.attr('height'));
                }
                d3.selectAll('.boxWhisker_legendCategory').remove();
                d3.selectAll('.boxWhisker_categorySize').remove();
                const legendOrient: LegendPosition = Visual.legend.getOrientation();
                this.updateLegendHelper(legendSetting, legendOrient, isScrollPresent, options);
                isScrollPresent = isScrollPresent || !Visual.catSizePresent;
                this.renderLegend(dataView, legendSetting, isScrollPresent);
                this.legendDotSvg
                    .attr({
                        class: 'boxWhisker_sizeLegend', height: 0, width: 0
                    }).style('position', 'absolute');
                dimensions = this.legendPositionUpdate(dimensions, legendSetting, legendOrient, legendHeight, isScrollPresent, options, legendContainer, legendWidth, legendContainer);
                height = dimensions[0]; width = dimensions[1];
                if (legendSetting.show && Visual.catSizePresent && rangeConfig.dots) {
                    this.renderSizeLegend(legendHeight, legendOrient, isScrollPresent, dataSizeValues, legendSetting, legendWidth, options);
                }
                this.svg.attr({
                    width: width, height: height
                });
                const originalSvgWidth: number = width, originalSvgHeight: number = height;
                this.updateSVG();
                let translate: number = 0, yAxisWidth: number = 0;
                let yAxisFormatter: utils.formatting.IValueFormatter;
                const xAxisWidth: number = 0, yAxisParentHeight: number = 0;
                let xAxisParentHeight: number = 0;
                let yAxisHeight: number = 0, iterator: number = 0;
                let xScale: any; let yScale: any; let rScale: any;
                let xAxisFormatter: utils.formatting.IValueFormatter; let yParentScale: any; yParentScale = null;
                const format: string = this.measureFormat;
                const boxArraylength: number = this.boxArray.length;
                this.renderBox(iterator, boxArraylength, options);
                let xAxisTitleText: string = Visual.xTitleText, yAxisTitleText: string = Visual.yTitleText;
                xAxisConfig.titleText ? xAxisTitleText = xAxisConfig.titleText : null;
                yAxisConfig.titleText ? yAxisTitleText = yAxisConfig.titleText : null;
                let rangeMin: number = 4, rangeMax: number = 8;
                let range: any = [rangeMax, rangeMin];
                range = this.updateRadiusScale(rangeConfig, range);
                rangeMax = range[0]; rangeMin = range[1];
                this.updateFlipSetting(flipSetting, xAxisConfig, xAxisFormatter, format, xAxisTitleText, xAxisParentHeight, yAxisConfig,
                    yAxisHeight, yAxisTitleText, yAxisWidth, parentAxisConfigs, width, height, originalSvgHeight,
                    originalSvgWidth, xScale, yScale, data, rScale, dataSizeValues, rangeMin, rangeMax, iterator, translate, tickSettings,
                    gridLinesSetting, backgroundSetting, boxOptionsSettings, rangeConfig, gradientSelectorSetting, yAxisFormatter, yParentScale, options);
                visualContext.clickFlag = false;
                const dots: d3.Selection<IBoxWhiskerViewModel> = d3.selectAll('.boxWhisker_dot');
                this.renderHoverLogic(visualContext, rangeConfig, dots);
                this.renderFiltering(dots, visualContext);
                $(document)
                    .on('click', () => this.selectionManager.clear()
                        .then(() => {
                            visualContext.syncSelectionState(dots, d3.selectAll('.legendItem'), []);
                        }));
                this.updateTooltip();
                this.syncSelectionState(dots, d3.selectAll('.legendItem'), this.selectionManager.getSelectionIds());
                this.events.renderingFinished(options);
            } catch (exception) {
                this.events.renderingFailed(options, exception);
            }
        }

        // Hover logic
        public renderHoverLogic(visualContext, rangeConfig, dots) {
            $('.boxWhisker_dot').mousemove(
                function (): void {
                    if (!visualContext.clickFlag) {
                        $(this)
                            .attr({
                                stroke: rangeConfig.hoverColor,
                                'stroke-opacity': (100 - rangeConfig.transparency) / 100,
                                'stroke-width': '2px'
                            });
                    }
                });
            $('.boxWhisker_dot').mouseout(
                (): void => {
                    if (!visualContext.clickFlag) {
                        dots.attr({
                            stroke: visualContext.rangeConfig.border ? visualContext.rangeConfig.borderColor : 'none'
                        });
                    }
                });
        }

        // Cross filtering
        public renderFiltering(dots, visualContext) {
            dots.on('click', (d: IBoxWhiskerViewModel): void => {
                visualContext.selectionManager.select(d.selectionId, true).then((ids: ISelectionId[]) => {
                    visualContext.syncSelectionState(dots, d3.selectAll('.legendItem'), ids);
                });
                (<Event>d3.event).stopPropagation();
            });
            $('#legendGroup').on('click.load', '.navArrow', (): void => {
                visualContext.addLegendSelection();
            });
            visualContext.addLegendSelection();
        }

        public updateTooltip() {
            // Adding tooltips on dots
            this.tooltipServiceWrapper.addTooltip(
                d3.selectAll('.boxWhisker_dot'),
                (tooltipEvent: TooltipEventArgs<IBoxWhiskerViewModel>) => this.getTooltipData(tooltipEvent.data, 0),
                (tooltipEvent: TooltipEventArgs<IBoxWhiskerViewModel>) => tooltipEvent.data.selectionId
            );
            // Adding tooltips on box, Q1 and Q3
            this.tooltipServiceWrapper.addTooltip(
                d3.selectAll('.boxUpper, .boxLower, .boxOutlineQ1, .boxOutlineQ3'),
                (tooltipEvent: TooltipEventArgs<number>) => this.getTooltipData(tooltipEvent.data, 0),
                (tooltipEvent: TooltipEventArgs<number>) => null
            );
            // Adding tooltips on whiskers
            this.tooltipServiceWrapper.addTooltip(
                d3.selectAll('.whiskerMinBox, .whiskerMaxBox, .whiskerMin, .whiskerMax'),
                (tooltipEvent: TooltipEventArgs<number>) => this.getTooltipData(tooltipEvent.data, 0),
                (tooltipEvent: TooltipEventArgs<number>) => null
            );
            // Adding tooltips on mean
            this.tooltipServiceWrapper.addTooltip(
                d3.selectAll('.shapeMean'),
                (tooltipEvent: TooltipEventArgs<number>) => this.getTooltipData(tooltipEvent.data, 1),
                (tooltipEvent: TooltipEventArgs<number>) => null
            );
        }

        // method to render visual selections according to selections
        private syncSelectionState(

            selection1: d3.Selection<IBoxWhiskerViewModel>,
            selection2: d3.Selection<any>,
            selectionIds: any[]
        ): void {

            if (!selection1 || !selection2 || !selectionIds) {

                return;
            }

            if (!selectionIds.length) {
                selection1.attr({
                    'fill-opacity': (100 - this.rangeConfig.transparency) / 100,
                    stroke: this.rangeConfig.border ? this.rangeConfig.borderColor : 'none',
                    'stroke-opacity': (100 - this.rangeConfig.transparency) / 100,
                    'stroke-width': 2
                });
                selection2.attr({ 'fill-opacity': 1 });
                this.color = [];
                this.clickFlag = false;
                // Highlighting logic
                if (this.highlight) {
                    this.clickFlag = true;

                    selection1.attr({
                        'fill-opacity': (d: IBoxWhiskerViewModel): number => {
                            if (d.highlights) {
                                return 0.9;
                            } else {
                                return 0.15;
                            }
                        },
                        'stroke-opacity': (d: IBoxWhiskerViewModel): number => {
                            if (d.highlights) {
                                return 0.9;
                            } else {
                                return 0.15;
                            }
                        }
                    });
                }

                return;
            }

            this.clickFlag = true;
            const self: this = this;
            // boolean to check if legend item is selected
            let legendClicked: boolean = false;

            selection1.each(function (dataPoint: IBoxWhiskerViewModel): void {

                const isSelected: boolean = self.isSelectionIdInArray(selectionIds, dataPoint.selectionId);
                d3.select(this).attr(
                    'fill-opacity',
                    isSelected ?
                        0.9 : 0.15
                );

                d3.select(this).attr(
                    'stroke-opacity',
                    isSelected ?
                        0.9 : 0.15
                );
            });

            selection1.attr({
                stroke: self.rangeConfig.border ? self.rangeConfig.borderColor : 'none'
            });

            selection2.each((legend: any): void => {
                const isSelected: boolean = self.isSelectionIdInArray(selectionIds, legend.identity);
                if (isSelected) {
                    legendClicked = true;
                }
            });

            if (legendClicked) {
                selection2.each(function (legend: any): void {
                    const isSelected: boolean = self.isSelectionIdInArray(selectionIds, legend.identity);
                    d3.select(this).attr(
                        'fill-opacity',
                        isSelected ?
                            1 : 0.15
                    );
                });
            }
        }

        // method to return boolean based on presence of value in array
        private isSelectionIdInArray(selectionIds: ISelectionId[], selectionId: ISelectionId): boolean {
            if (!selectionIds || !selectionId) {
                return false;
            }

            return selectionIds.some((currentSelectionId: ISelectionId) => {
                return currentSelectionId.includes(selectionId);
            });
        }

        public addLegendSelection(): void {
            const dots: d3.Selection<IBoxWhiskerViewModel> = d3.selectAll('.boxWhisker_dot');
            const visualContext: this = this;
            let currentThis: this;
            currentThis = this;
            const legends: d3.Selection<any> = d3.selectAll('.legendItem');
            let selectionManager: ISelectionManager;
            selectionManager = this.selectionManager;
            legends.on('click', function (d: any): void {
                const this1: any = this;
                const index: number = visualContext.color.indexOf(d.tooltip.toString());
                if (index === -1) {
                    visualContext.color.push(d.tooltip.toString());
                } else {
                    visualContext.color.splice(index, 1);
                }
                selectionManager.select(d.identity).then((ids: any[]) => {
                    if (ids.length > 0) {
                        dots.attr('fill-opacity', (d1: any) => {
                            if (this1.__data__.tooltip === d1.categoryColor) {
                                return 2;
                            } else {
                                return 0.15;
                            }
                        });
                    } else {
                        visualContext.syncSelectionState(dots, d3.selectAll('.legendItem'), []);
                        d3.selectAll('.boxWhisker_dot').attr({
                            'fill-opacity': 2
                        });
                    }
                    legends.attr({
                        'fill-opacity': ids.length > 0 ? 0.5 : 1
                    });
                    d3.select(this).attr({
                        'fill-opacity': 1
                    });
                });
                (<Event>d3.event).stopPropagation();
            });
        }
        public renderLegend(dataViews: DataView, legendConfig: ILegendConfig, isScrollPresent: boolean): void {
            if (!Visual.legendDataPoints && Visual.legendDataPoints.length) { return; }
            const sTitle: string = '';
            let legendObjectProperties: DataViewObject;
            if (dataViews && dataViews.metadata) {
                legendObjectProperties = powerbi
                    .extensibility
                    .utils
                    .dataview
                    .DataViewObjects
                    .getObject(dataViews.metadata.objects, 'legend', {});
            }

            let legendData: ILegendDataPoint[];
            legendData = Visual.legendDataPoints;
            const legendDataTorender: utils.chart.legend.LegendData = {
                dataPoints: [],
                fontSize: legendConfig.fontSize,
                labelColor: legendConfig.labelColor,
                title: Visual.legendTitle
            };

            for (const iCounter of legendData) {
                legendDataTorender.dataPoints.push({
                    color: iCounter.color,
                    icon: powerbi.extensibility.utils.chart.legend.LegendIcon.Box,
                    identity: iCounter.identity,
                    label: iCounter.category,
                    selected: iCounter.selected
                });
            }
            if (legendObjectProperties) {
                powerbi.extensibility.utils.chart.legend.data.update(legendDataTorender, legendObjectProperties);
                const position: string = <string>legendObjectProperties[powerbi.extensibility.utils.chart.legend.legendProps.position];
                if (position) { Visual.legend.changeOrientation(powerbi.extensibility.utils.chart.legend.LegendPosition[position]); }

            }

            const legendOrient: LegendPosition = Visual.legend.getOrientation();
            const legendViewport: IViewport = _.clone(this.viewport);
            switch (legendOrient) {
                case 0:
                case 1:
                    if (!isScrollPresent) {
                        legendViewport.width = legendViewport.width / 2;
                    }
                    break;
                case 2:
                case 3:
                    if (!isScrollPresent) {
                        legendViewport.height = legendViewport.height / 2;
                    }
                    break;
                default:
                    break;
            }
            Visual.legend.drawLegend(
                legendDataTorender,
                ({ width: legendViewport.width, height: legendViewport.height }), this.legendSetting
            );
            powerbi.extensibility.utils.chart.legend.positionChartArea(this.baseContainer, Visual.legend);
            if (this.baseContainer.style('margin-top')) {
                const value: number = parseFloat(this.baseContainer.style('margin-top')
                    .substr(0, this.baseContainer.style('margin-top').length - 2));
                this.baseContainer.style('margin-top', `${value + 2}px`);
            }
        }

        public renderSizeLegendHelperOne(sizeLegendHeight, legendCircles, legendSetting, dataSizeValues, isScrollPresent, options, measureTextProperties, sizeLegendTitleText) {
            const sizeArray: {
                cX: number; r: number;
            }[] = [{ cX: 0, r: 0 }];
            let cX: number = 0 + 10;
            let radius: number = 0;
            for (let iCounter: number = 0; iCounter < 6; iCounter++) {
                radius = 2 + (iCounter * (Number(sizeLegendHeight) / 30)); // 2 was taken to have minimum circle visible
                cX = cX + (radius * 2) + 5 + iCounter * 1; // 5 is distance between circles
                const obj: {
                    cX: number; r: number;
                } = { cX: cX, r: radius };
                sizeArray.push(obj);
            }
            for (let iCounter: number = 1; iCounter < sizeArray.length; iCounter++) {
                legendCircles.append('circle')
                    .classed('boxWhisker_legendDot', true)
                    .attr({
                        cx: sizeArray[iCounter].cX,
                        cy: radius + Number(sizeLegendHeight) / 7,
                        fill: legendSetting.sizeLegendColor,
                        r: sizeArray[iCounter].r
                    });
            }
            const legendDotData: number[] = [];
            const legendFormatter: utils.formatting.IValueFormatter = valueFormatter.create({
                format: this.sizeFormat,
                value: legendSetting.displayUnits === 0 ? boxWhiskerUtils.returnMax(dataSizeValues, true) : legendSetting.displayUnits,
                precision: legendSetting.decimalPlaces
            });
            const legendTooltipFormatter: utils.formatting.IValueFormatter = valueFormatter.create({ format: valueFormatter.DefaultNumericFormat });
            legendDotData.push(boxWhiskerUtils.returnMin(dataSizeValues, true));// Push minimum and maximum category size values in this array
            legendDotData.push(boxWhiskerUtils.returnMax(dataSizeValues, true));
            for (let iCount: number = 0; iCount < 2; iCount++) {
                let x: number = 0; let y: number = 0;
                if (iCount === 0) {
                    x = sizeArray[1].cX;
                } else {
                    x = sizeArray[sizeArray.length - 1].cX;
                }
                y = (radius * 2) + Number(sizeLegendHeight) / 2;
                const textProperties: TextProperties = {
                    fontFamily: legendSetting.fontFamily,
                    fontSize: `${sizeLegendHeight / 2.5}px`,
                    text: legendFormatter.format(legendDotData[iCount])
                };
                legendCircles.append('text')
                    .classed('boxWhisker_legendDotText', true)
                    .attr({ fill: legendSetting.labelColor, x: x, y: y })
                    .style({
                        color: legendSetting.labelColor,
                        'font-size': `${sizeLegendHeight / 2.5}px`,
                        'font-family': legendSetting.fontFamily,
                        'text-anchor': 'middle'
                    }).text(textMeasurementService.getTailoredTextOrDefault(textProperties, 40))
                    .append('title')
                    .text(legendTooltipFormatter.format(legendDotData[iCount]));
            }
            const totalWidth: number = sizeArray[sizeArray.length - 1].cX - sizeArray[0].cX + 10;

            const sizeLegendTitleUpdatedText: string = textMeasurementService // Size legend title
                .getTailoredTextOrDefault(
                    measureTextProperties,
                    (isScrollPresent ? options.viewport.width : options.viewport.width / 2) - totalWidth - 20
                );
            measureTextProperties = {
                fontFamily: legendSetting.fontFamily,
                fontSize: `${legendSetting.fontSize}pt`,
                text: sizeLegendTitleUpdatedText
            };
            const sizeLegendTitleWidth: number = textMeasurementService.measureSvgTextWidth(measureTextProperties);
            const legendDotText: d3.Selection<SVGElement> = this.legendDotSvg
                .append('g')
                .classed('boxWhisker_legendCategory', true)
                .append('text')
                .text(sizeLegendTitleUpdatedText)
                .style({
                    'font-color': legendSetting.labelColor,
                    'font-size': `${legendSetting.fontSize}pt`,
                    'font-family': legendSetting.fontFamily,
                    'font-weight': 600
                });
            legendDotText.attr({
                fill: legendSetting.labelColor, x: 2,
                y: 9 + parseFloat(this.legendSetting.fontSize.toString())
            }).append('title')
                .text(sizeLegendTitleText);
            if (!isScrollPresent) {
                legendDotText
                    .attr('transform', `translate(${(isScrollPresent ?
                        options.viewport.width : options.viewport.width / 2) - totalWidth - 20 - sizeLegendTitleWidth}, 0)`);
                legendCircles
                    .attr('transform', `translate(${(isScrollPresent ? options.viewport.width : options.viewport.width / 2) - totalWidth - 10},0)`);
            } else {
                legendCircles.attr('transform', `translate(${sizeLegendTitleWidth},0)`);
            }
        }

        public renderSizeLegendHelperTwo(legendCircles, sizeLegendWidth, legendSetting, dataSizeValues, options, measureTextProperties, sizeLegendTitleText) {
            const sizeArray: {
                cY: number;
                r: number;
            }[] = [{ cY: 0, r: 0 }];
            let cY: number = 25;
            let radius: number = 0;
            for (let iCounter: number = 0; iCounter < 6; iCounter++) {
                radius = 2 + (iCounter * (Number(sizeLegendWidth) / 80)); // 3 was taken to have minimum circle visible
                cY = cY + (radius * 2) + 3 + iCounter * 1; // 5 is distance between circles
                const obj: {
                    cY: number; r: number;
                } = {
                    cY: cY,
                    r: radius
                };
                sizeArray.push(obj);
            }
            for (let iCounter: number = 1; iCounter < sizeArray.length; iCounter++) {
                legendCircles.append('circle')
                    .classed('boxWhisker_legendDot', true)
                    .attr({
                        cx: radius + Number(sizeLegendWidth) / 7,
                        cy: sizeArray[iCounter].cY,
                        fill: legendSetting.sizeLegendColor,
                        r: sizeArray[iCounter].r
                    });
            }
            const legendDotData: number[] = [];
            const legendFormatter: utils.formatting.IValueFormatter = valueFormatter.create({
                format: this.sizeFormat,
                value: legendSetting.displayUnits === 0 ? boxWhiskerUtils.returnMax(dataSizeValues, true) : legendSetting.displayUnits,
                precision: legendSetting.decimalPlaces
            });
            const legendTooltipFormatter: utils.formatting.IValueFormatter = valueFormatter.create({
                format: valueFormatter.DefaultNumericFormat
            });
            legendDotData.push(boxWhiskerUtils.returnMin(dataSizeValues, true));// Push minimum and maximum category size values in this array
            legendDotData.push(boxWhiskerUtils.returnMax(dataSizeValues, true));
            for (let iCount: number = 0; iCount < 2; iCount++) {
                let x: number = 0; let y: number = 0;
                if (iCount === 0) {
                    y = sizeArray[1].cY + 5;
                } else {
                    y = sizeArray[sizeArray.length - 1].cY + 5;
                }
                x = (radius) + Number(sizeLegendWidth) / 2;
                const textProperties: TextProperties = {
                    fontFamily: legendSetting.fontFamily,
                    fontSize: `${sizeLegendWidth / 6}px`,
                    text: legendFormatter.format(legendDotData[iCount])
                };
                legendCircles.append('text')
                    .classed('boxWhisker_legendDotText', true)
                    .attr({ fill: legendSetting.labelColor, x: x, y: y })
                    .style({
                        color: legendSetting.labelColor,
                        'font-size': `${sizeLegendWidth / 8}px`,
                        'font-family': legendSetting.fontFamily,
                        'text-anchor': 'middle'
                    })
                    .text(textMeasurementService.getTailoredTextOrDefault(textProperties, ((radius) + Number(sizeLegendWidth) / 2)))
                    .append('title')
                    .text(legendTooltipFormatter.format(legendDotData[iCount]));
            }
            const totalHeight: number = sizeArray[sizeArray.length - 1].cY - sizeArray[0].cY + 10;
            legendCircles.attr('transform', `translate(0, ${options.viewport.height / 2 - totalHeight})`);
            const sizeLegendTitleUpdatedText: string = textMeasurementService // Size legend title
                .getTailoredTextOrDefault(measureTextProperties, parseFloat(d3.select('.legend').style('width')));
            measureTextProperties = {
                fontFamily: legendSetting.fontFamily,
                fontSize: `${legendSetting.fontSize}pt`,
                text: sizeLegendTitleUpdatedText
            };
            const sizeLegendTitleHeight: number = textMeasurementService.measureSvgTextHeight(measureTextProperties);
            const legendDotText: d3.Selection<SVGElement> = this.legendDotSvg
                .append('g')
                .classed('boxWhisker_legendCategory', true)
                .append('text')
                .text(sizeLegendTitleUpdatedText)
                .style({
                    'font-color': legendSetting.labelColor,
                    'font-size': `${legendSetting.fontSize}pt`,
                    'font-family': legendSetting.fontFamily,
                    'font-weight': 600
                });
            legendDotText.attr({
                fill: legendSetting.labelColor,
                x: 2,
                y: 0
            })
                .append('title')
                .text(sizeLegendTitleText);
            legendDotText
                .attr('transform', `translate(5,${(options.viewport.height / 2) - totalHeight - sizeLegendTitleHeight + 20})`);
        }

        public renderSizeLegend(
            sizeLegendHeight: number,
            legendOrient: LegendPosition,
            isScrollPresent: boolean,
            dataSizeValues: number[],
            legendSetting: ILegendConfig,
            sizeLegendWidth: number,
            options: VisualUpdateOptions): void {
            const sizeLegendTitleText: string = this.legendDotTitle ? this.legendDotTitle : '';
            let measureTextProperties: TextProperties = {
                fontFamily: legendSetting.fontFamily,
                fontSize: `${legendSetting.fontSize}pt`,
                text: sizeLegendTitleText
            };

            const legendCircles: d3.Selection<SVGElement> = this.legendDotSvg
                .append('g')
                .classed('boxWhisker_categorySize', true);

            if (legendOrient === 0 || legendOrient === 1) {
                this.renderSizeLegendHelperOne(sizeLegendHeight, legendCircles, legendSetting, dataSizeValues,
                    isScrollPresent, options, measureTextProperties, sizeLegendTitleText);

            } else if ((legendOrient === 2 || legendOrient === 3) && !isScrollPresent) {
                this.renderSizeLegendHelperTwo(legendCircles, sizeLegendWidth, legendSetting, dataSizeValues,
                    options, measureTextProperties, sizeLegendTitleText);

            }
        }

        public getTooltipData(value: any, isMean: number): VisualTooltipDataItem[] {
            const tooltipDataPoints: VisualTooltipDataItem[] = [];
            if (isMean === 1) {
                for (const iCounter of value.tooltipData) {
                    if (iCounter.name === 'Mean') {
                        const tooltipData: VisualTooltipDataItem = {
                            displayName: '',
                            value: ''
                        };
                        tooltipData.displayName = iCounter.name;
                        tooltipData.value = iCounter.value;
                        tooltipDataPoints.push(tooltipData);
                    }
                }
            } else {
                for (const iCounter of value.tooltipData) {
                    const tooltipData: VisualTooltipDataItem = {
                        displayName: '',
                        value: ''
                    };
                    tooltipData.displayName = iCounter.name;
                    tooltipData.value = iCounter.value;
                    tooltipDataPoints.push(tooltipData);
                }
            }

            return tooltipDataPoints;
        }

        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions): VisualObjectInstanceEnumeration {
            const objectName: string = options.objectName;
            const objectEnumeration: VisualObjectInstance[] = [];
            const parentAxisConfigs: IParentAxisSettings = this.parentAxisConfigs;
            const flipSetting: IFlipSettings = this.flipSetting;
            const sortSetting: ISortSettings = this.sortSetting;
            const yAxisConfigs: IAxisSettings = this.yAxisConfig;
            const xAxisConfigs: IAxisSettings = this.xAxisConfig;
            const rangeSetting: IRangeSettings = this.rangeConfig;
            const legendConfig: ILegendConfig = this.legendSetting;
            const gradientSelectorSetting: IGradientSelectorSettings = this.gradientSetting;
            const backgroundSetting: IBackgroundSettings = this.backgroundSetting;
            const gridLinesSetting: IGridLinesSettings = this.gridLinesSetting;
            const tickSetting: ITickSettings = this.tickSetting;
            const boxOptionsSetting: IBoxOptionsSettings = this.boxOptionsSetting;
            const meanSetting: IMeanSettings = this.meanSetting;

            switch (objectName) {
                case 'parentAxis':
                    boxWhiskerSettings.enumerateParentAxis(parentAxisConfigs, objectEnumeration, objectName);
                    break;

                case 'backgroundBanding':
                    boxWhiskerSettings.enumerateBackgroundBanding(backgroundSetting, objectEnumeration, objectName, xAxisConfigs);
                    break;
                case 'gridLines':
                    boxWhiskerSettings.enumerateGridLines(gridLinesSetting, objectEnumeration, objectName, xAxisConfigs);
                    break;
                case 'tickMarks':
                    boxWhiskerSettings.enumerateTickMarks(tickSetting, objectEnumeration, objectName);
                    break;
                case 'yAxis':
                    boxWhiskerSettings.enumerateYAxis(yAxisConfigs, objectEnumeration, objectName, flipSetting);
                    break;
                case 'xAxis':
                    boxWhiskerSettings.enumerateXAxis(xAxisConfigs, objectEnumeration, objectName, flipSetting);
                    break;
                case 'legend':
                    boxWhiskerSettings.enumerateLegend(legendConfig, objectEnumeration, objectName);
                    break;
                case 'colorSelector':
                    boxWhiskerSettings.enumerateColorSelector(objectEnumeration, objectName);
                    break;
                case 'gradientSelector':
                    boxWhiskerSettings.enumerateGradientSelector(gradientSelectorSetting, objectEnumeration, objectName);
                    break;
                case 'RangeSelector':
                    boxWhiskerSettings.enumerateRangeSelector(rangeSetting, objectEnumeration, objectName);
                    break;
                case 'flip':
                    boxWhiskerSettings.enumerateFlip(flipSetting, objectEnumeration, objectName);
                    break;
                case 'sort':
                    boxWhiskerSettings.enumerateSort(sortSetting, objectEnumeration, objectName, Visual.catGroupPresent, Visual.xParentPresent);
                    break;
                case 'boxOptions':
                    boxWhiskerSettings.enumerateBoxOptions(boxOptionsSetting, objectEnumeration, objectName);
                    break;
                case 'meanConfig':
                    boxWhiskerSettings.enumerateMean(meanSetting, objectEnumeration, objectName);
                    break;
                default:
            }

            return objectEnumeration;
        }
    }
}
