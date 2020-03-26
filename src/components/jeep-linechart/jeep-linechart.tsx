import { h, Component, Host, Prop, Method, Element, State, Watch, Event, EventEmitter, Listen } from '@stencil/core';
import { Rect, Point } from '../../global/interfaces/geom';
import { Variables }  from '../../global/interfaces/jeep-linechart';
import { Status, DataSet, DataSets, AxisLength, Legend, NearestPoint }  from '../../global/interfaces/charts';
import { convertCSSNumber, convertCSSBoolean, getBoundingClientRect }  from '../../utils/common';
import { checkDataSetsValidity, axisRange, axisConvertY, axisConvertX,getTotalLength,getNearest} from '../../utils/chart-svgelements';

@Component({
  tag: 'jeep-linechart',
  styleUrl: 'jeep-linechart.css',
  shadow: true
})
export class JeepLinechart {
  @Element() el!: HTMLJeepLinechartElement;

  //************************
  //* Property Definitions *
  //************************

    @Prop({
      reflectToAttr: true
    }) ctitle: string;
    @Prop({
      reflectToAttr: true
    }) subtitle: string;
    @Prop({
      reflectToAttr: true
    }) xtitle: string;
    @Prop({
      reflectToAttr: true
    }) ytitle: string;
    @Prop({
      reflectToAttr: true
    }) data: string;
    @Prop({
      reflectToAttr: true
    }) animation: boolean;
    @Prop({
      reflectToAttr: true
    }) cborder: boolean;
    @Prop({
      reflectToAttr: true
    }) delay: string;

  //*****************************
  //* Watch on Property Changes *
  //*****************************

  @Watch('ctitle')
  async parseTitleProp(newValue: string) {
    this.innerTitle = newValue ? newValue : null;
  }
  @Watch('subtitle')
  async parseSubTitleProp(newValue: string) {
    this.innerSubTitle = newValue ? newValue : null;
  }
  @Watch('xtitle')
  parseXTitleProp(newValue: string) {
    this.innerXTitle = newValue ? newValue : null;
  }
  @Watch('ytitle')
  parseYTitleProp(newValue: string) {
    this.innerYTitle = newValue ? newValue : null;
  }
  @Watch('data')
  async parseDataProp(newValue: string) {
    const data = newValue ? newValue : null;
    let dataSets: Array<DataSet> = []; 
    this._status = {status:200};
    if(data != null) {
      const typeArr: Array<string> = ["scatter","line"];
      let inpData = JSON.parse(data);
      let objData: Array<DataSet> = [];
      if(inpData instanceof Array) {
        objData = inpData;
      } else {
        objData.push(inpData);
      }
      this._axisType = [];
      this._legendNames = [];
      this._legendColors = [];
      this._legendThicknesses = [];
      if(objData.length >= 1 && Object.keys(objData[0]).length >=1) {
        for(let i: number = 0; i < objData.length;i++) {
          if(objData[i].dataPoints) {
            let dataSet: DataSet = {} as DataSet;
            dataSet.color = objData[i].color ? objData[i].color : "#000000";
            dataSet.name = objData[i].name ? objData[i].name : null;
            dataSet.type = objData[i].type && typeArr.indexOf(objData[i].type) != -1 ? objData[i].type : "line";  
            dataSet.lineThickness = objData[i].lineThickness ? objData[i].lineThickness: 1;
            dataSet.markerType = objData[i].markerType ? objData[i].markerType : "none";
            if(dataSet.type === "scatter" && dataSet.markerType === "none") dataSet.markerType = "plus";
            dataSet.markerColor = objData[i].markerColor ? objData[i].markerColor : dataSet.color;
            dataSet.markerSize = objData[i].markerSize ? objData[i].markerSize : 10;
            dataSet.dataPoints = objData[i].dataPoints;
            this._legendThicknesses.push(dataSet.lineThickness);
            this._legendColors.push(dataSet.color);
            if(dataSet.name !== null) this._legendNames.push(dataSet.name);
            // check if 'x' or 'label' in dataPoints
            const dataSetKeys = Object.keys(dataSet.dataPoints[0]);
            if(dataSetKeys.indexOf('label') == -1 && dataSetKeys.indexOf('x') ==-1) {
              dataSets = null;
              this._status = {status:400, message:"Error: no 'x' or 'label' data in dataset: " + i + " of data property" };           
            } else if(dataSetKeys.indexOf('y') === -1){
                dataSets = null;
                this._status = {status:400, message:"Error: no y data in dataset: " + i + " of data property" };            
            } else {
              if(i === 0) {
                if(dataSetKeys.indexOf('label') != -1) this._axisType.push("label");
                if(dataSetKeys.indexOf('x') != -1) this._axisType.push("x"); 
                this._axisType.push("y"); 
              }     
              dataSets.push(dataSet);  
            }
          } else {
            dataSets = null;
            this._status = {status:400, message:"Error: no dataPoints object in dataset: " + i + " of data property" };            
          }
        }
        if(this._status.status === 200 && dataSets && dataSets.length > 1 && dataSets.length !== this._legendNames.length) {
          dataSets = null;
          this._status = {status:400, message:"Error: name attribute missing in some datasets"};
        } 
      } else { 
        dataSets = null;
        this._status = {status:400, message:"Error: no data provided"};      
      }
    } else {
      dataSets = null;
      this._status = {status:400, message:"Error: no data property"};      
    }
    if(this._status.status === 200) {
      // check the dataSets 'x' or 'label' validity
      const retSets: DataSets = checkDataSetsValidity(dataSets,this._axisType);
      dataSets = retSets.dataSets;
      if(dataSets === null) 
      this._status = {status:400, message: "Error: " +retSets.message};      
    }
    this._label = this._status.status === 200 && this._axisType[0] === 'label' ? true : false;
    this.innerData = this._status.status === 200 ? [...dataSets] : null;

  }
  @Watch('animation')
  parseAnimationProp(newValue: boolean) {
    this.innerAnimation = newValue ? newValue : false;
  }
  @Watch('cborder')
  parseBorderProp(newValue: boolean) {
    this.innerBorder = newValue ? newValue : false;
  }
  @Watch('delay')
  parseDelayProp(newValue: string) {
    this.innerDelay = newValue ? parseFloat(newValue) : 100;
  }

  //************************
  //* State Definitions *
  //************************

  @State() innerTitle:string;
  @State() innerSubTitle: string;
  @State() innerXTitle:string;
  @State() innerYTitle:string;
  @State() innerData:Array<DataSet>;
  @State() innerStyle: string;
  @State() innerAnimation: boolean;
  @State() innerBorder: boolean;
  @State() innerDelay: number;
  @State() toggle: boolean = false;
  @State() chartUpdate:boolean = false;
//  @State() status: Status;

  //*********************
  //* Event Definitions *
  //*********************

  @Event({eventName:'jeepLinechartReady'}) readyLinechart: EventEmitter;

  //*******************************
  //* Listen to Event Definitions *
  //*******************************
  
  @Listen('resize', { target:'window' })
  async handleWindowResize() {
    await this._windowResize();
  }

  //**********************
  //* Method Definitions *
  //**********************
  
  @Method()
  init(): Promise<void> {
      return Promise.resolve(this._init());
  }
  @Method()
  getStatus(): Promise<Status> {
    return Promise.resolve(this._status);
  }
  @Method()
  renderChart(): Promise<void> {
  return Promise.resolve(this._renderChart());
  }
  @Method()
  async getCssProperties():Promise<Variables> {
    return this._prop;
  }

  //**********************************
  //* Internal Variables Declaration *
  //**********************************
    window: Window | any;
    document: Document | any;
    root:Element | any;

    _container: HTMLElement = null;
    _svg: HTMLElement;
    _groupEl: HTMLElement; 
    _borderEl: HTMLElement;
    _borderBB: ClientRect;
    _titleBB: ClientRect;
    _xTitleBB: ClientRect;
    _yTitleBB: ClientRect;
    _legendBB: ClientRect;
    _dummyLabelY: any;
    _dummyLabelX: any;
    _chartBB: Rect = {top:0,left:0,height:0,width:0};
    _dummyLabelYEl: HTMLElement;    
    _dummyLabelXEl: HTMLElement;
    _dummyLegendItemEl: HTMLElement;    
    _titleEl: HTMLElement;
    _axesEl: HTMLElement;
    _legendEl: HTMLElement;
    _yTitleEl: HTMLElement;
    _xTitleEl: HTMLElement;
    _dataEl: HTMLElement;
    _titleTextEl: Element = null;
    _subtitleTextEl: Element = null;

    _padding: number = 10;

    _element: any;
    _prop: Variables
    _wSize: Rect;
    _chartRect: Rect;
    _titleRect:Rect;
    _update: boolean = false;
    _Points: Array<Array<Point>>;
    _selMarker: Array<string>;
    _axisType: Array<string>;
    _legendRect: Rect;
    _legendNames: Array<string>;
    _legendColors: Array<string>;
    _legendThicknesses: Array<number>;
    _legend: Legend;
    _dataColor: boolean;
    _label: boolean;
    _labelRotate: boolean;
    _x_type:string;
    _x_axy:number;
    _y_axy:number;
    _lenY:AxisLength;
    _lenX:AxisLength;
    _nXlines: number;
    _nYlines: number;
    _nXlinesDataSet: number;
    _xInterval: number;
    _yaxis:Rect;
    _xaxis:Rect;
    _showTarget: any;
    _xmlns: string;
    _xlink: string;
    _mouseStart: boolean;
    _status: Status;

  //*******************************
  //* Component Lifecycle Methods *
  //*******************************

  async componentWillLoad() {
    this.window = window;
    this._element = this.el.shadowRoot;
    this._prop = {} as Variables;
    await this._init();
  }
  async componentDidLoad() {

    if(this._status.status === 200) {
      await this.renderChart();
    }        
  }
  async componentDidUpdate() {
  }
  //******************************
  //* Private Method Definitions *
  //******************************

  async _init(): Promise<void> {
    // init some variables
    this.document = this.window.document;
    this.root = this.document.documentElement;
    this._selMarker = [];
    this._axisType = [];
    this._update = false;
    this._dataColor = false;
    this._yaxis = {} as Rect;
    this._xaxis = {} as Rect;
    this._legendRect = {} as Rect;
    this._showTarget = 0;
    this._mouseStart = false;
    this._xmlns = "http://www.w3.org/2000/svg";
    this._xlink = 'http://www.w3.org/1999/xlink';            

    // reading properties
    this.parseTitleProp(this.ctitle ? this.ctitle : null);
    this.parseSubTitleProp(this.subtitle ? this.subtitle : null);
    this.parseXTitleProp(this.xtitle ? this.xtitle : null);
    this.parseYTitleProp(this.ytitle ? this.ytitle : null);
    this.parseAnimationProp(this.animation ? this.animation : false);
    this.parseBorderProp(this.cborder ? this.cborder : false);
    this.parseDelayProp(this.delay ? this.delay : "100");
    // reading global css properties
    this._prop.topPlot = this._prop.topPlot ? this._prop.topPlot : this._setPropertyValue('--chart-top',this.window.getComputedStyle(this.root).getPropertyValue('--chart-top'));
    this._prop.leftPlot = this._prop.leftPlot ? this._prop.leftPlot : this._setPropertyValue('--chart-left',this.window.getComputedStyle(this.root).getPropertyValue('--chart-left'));
    this._prop.widthPlot = this._prop.widthPlot ? this._prop.widthPlot : this._setPropertyValue('--chart-width',this.window.getComputedStyle(this.root).getPropertyValue('--chart-width'));
    this._prop.heightPlot = this._prop.heightPlot ? this._prop.heightPlot : this._setPropertyValue('--chart-height',this.window.getComputedStyle(this.root).getPropertyValue('--chart-height'));
    this._prop.bgColor = this._prop.bgColor ? this._prop.bgColor : this._setPropertyValue('--chart-background-color',this.window.getComputedStyle(this.root).getPropertyValue('--chart-background-color'));
    this._prop.tiColor = this._setPropertyValue('--chart-title-color',this.window.getComputedStyle(this.root).getPropertyValue('--chart-title-color'));
    this._prop.stColor = this._setPropertyValue('--chart-subtitle-color',this.window.getComputedStyle(this.root).getPropertyValue('--chart-subtitle-color'));
    this._prop.ftFamily = this._setPropertyValue('--chart-font-family',this.window.getComputedStyle(this.root).getPropertyValue('--chart-font-family'));             
    this._prop.ftTiSize = this._setPropertyValue('--chart-title-font-size',this.window.getComputedStyle(this.root).getPropertyValue('--chart-title-font-size'));
    this._prop.ftSTSize = this._setPropertyValue('--chart-subtitle-font-size',this.window.getComputedStyle(this.root).getPropertyValue('--chart-subtitle-font-size'));
    this._prop.axColor = this._setPropertyValue('--chart-axis-color',this.window.getComputedStyle(this.root).getPropertyValue('--chart-axis-color'));
    this._prop.lnColor = this._setPropertyValue('--chart-line-color',this.window.getComputedStyle(this.root).getPropertyValue('--chart-line-color'));
    this._prop.atColor = this._setPropertyValue('--chart-axis-title-color',this.window.getComputedStyle(this.root).getPropertyValue('--chart-axis-title-color'));
    this._prop.lbColor = this._setPropertyValue('--chart-label-color',this.window.getComputedStyle(this.root).getPropertyValue('--chart-label-color'));
    this._prop.ftLbSize = this._setPropertyValue('--chart-label-font-size',this.window.getComputedStyle(this.root).getPropertyValue('--chart-label-font-size'));
    this._prop.ftATSize = this._setPropertyValue('--chart-axis-title-font-size',this.window.getComputedStyle(this.root).getPropertyValue('--chart-axis-title-font-size'));
    this._prop.tickX = this._setPropertyValue('--chart-tick-x-length',this.window.getComputedStyle(this.root).getPropertyValue('--chart-tick-x-length'));
    this._prop.tickY = this._setPropertyValue('--chart-tick-y-length',this.window.getComputedStyle(this.root).getPropertyValue('--chart-tick-y-length'));
    this._prop.gridX = this._setPropertyValue('--chart-grid-x',this.window.getComputedStyle(this.root).getPropertyValue('--chart-grid-x'));
    this._prop.xInterval = this._setPropertyValue('--chart-axis-x-interval',this.window.getComputedStyle(this.root).getPropertyValue('--chart-axis-x-interval'));
    this._prop.yInterval = this._setPropertyValue('--chart-axis-y-interval',this.window.getComputedStyle(this.root).getPropertyValue('--chart-axis-y-interval'));
    this._prop.xZero = this._setPropertyValue('--chart-axis-x-zero',this.window.getComputedStyle(this.root).getPropertyValue('--chart-axis-x-zero'));
    this._prop.yZero = this._setPropertyValue('--chart-axis-y-zero',this.window.getComputedStyle(this.root).getPropertyValue('--chart-axis-y-zero'));
    this._prop.animDuration = this._setPropertyValue('--chart-animation-duration',this.window.getComputedStyle(this.root).getPropertyValue('--chart-animation-duration'));
    this._prop.legendTop = this._setPropertyValue('--chart-legend-top',this.window.getComputedStyle(this.root).getPropertyValue('--chart-legend-top'));
    this._prop.ftLgSize = this._setPropertyValue('--chart-legend-font-size',this.window.getComputedStyle(this.root).getPropertyValue('--chart-legend-font-size'));
    this._prop.bdColor = this._setPropertyValue('--chart-border-color',this.window.getComputedStyle(this.root).getPropertyValue('--chart-border-color'));
    this._prop.bdWidth = this._setPropertyValue('--chart-border-width',this.window.getComputedStyle(this.root).getPropertyValue('--chart-border-width'));
    // reading data          
    this.parseDataProp(this.data ? this.data : null);
  }

  _setPropertyValue(name:string, value?:string): string {
    if(name === '--chart-background-color') {
      return value ? value : "#ffffff";
    } else if ( name.slice(-5) === 'color') {
      return value ? value : "#000000";
    } else if ( name.slice(-12) === 'border-width') {
      return value ? value : "1";
    } else if ( name.slice(-9) === 'font-size') {
      return value ? value : "10px";
    } else if ( name.slice(-11) === 'font-family') {
      return value ? value : "Verdana";     
    } else if ( name.slice(-6).substring(0,4) === 'grid') {
      return value ? value : "false";     
    } else if ( name.slice(-4) === 'zero') {
      return value ? value : "true";
    } else if ( name.slice(-10) === 'legend-top') {
      return value ? value : "false";     
    } else if ( name.slice(-8) === 'duration') {
      return value ? value : "1s";
    } else {
      return value ? value : "0";
    }      
  }

  /* ---- Deal with Chart SVG Elements  */

  /**
   * Create the Chart Title and Subtitle
   *  
   */

  _createTitle(): any[] {
    let textTitle: any[] = [];
    const yt: string = (convertCSSNumber(this._prop.ftTiSize)+this._padding).toString();
    textTitle = [...textTitle,
      <text x="50%" y={yt} id="linechart-title-text" font-family={this._prop.ftFamily} 
        font-size={this._prop.ftTiSize} text-anchor="middle" fill={this._prop.tiColor}>
        {this.innerTitle}
      </text> 
    ];

    if(this.innerSubTitle != null) { 
      const yst:string = (Number(yt) + convertCSSNumber(this._prop.ftSTSize)+2).toString();  
      textTitle = [...textTitle,
        <text x="50%" y={yst} id="linechart-subtitle-text" font-family={this._prop.ftFamily} 
        font-size={this._prop.ftSTSize} text-anchor="middle" fill={this._prop.stColor}>
        {this.innerSubTitle}
        </text>        
      ];
      }
    return textTitle;
  }

  /**
   * Create the Chart Axes
   *  
   */
  _createAxes(): any[] {
    let axisEls: any[] = [];
    const tickXL: number = convertCSSNumber(this._prop.tickX);
    const tickYL: number = convertCSSNumber(this._prop.tickY);

    this._x_axy =  3 + this._dummyLabelY.width + 2 + tickYL;
    // Check if we have to rotate the labelXSizeEl element
    this._nXlines = this.innerData[0].dataPoints.length;
    if(this._lenX.interval && this._lenX.type === 'number') {
      this._nXlines = Math.abs(Math.floor(this._lenX.length / this._lenX.interval)) + 1;
    }
    let xLength:number = this._chartBB.width - this._x_axy;
    this._xInterval = Math.floor(xLength/this._nXlines);
    if(this._lenX.interval && this._lenX.type === 'number') {   
          this._xInterval = xLength/(this._nXlines-1);
    }
    let lbldist:number = this._xInterval;
    if(this._lenX.interval && this._lenX.type === 'string') {
      this._nXlines = Math.abs(Math.floor(this.innerData[0].dataPoints.length / this._lenX.interval));
      lbldist = xLength/(this._nXlines);
    }
    this._labelRotate = false;
    let dummyLabelX = {width:this._dummyLabelX.width,height:this._dummyLabelX.height};
    if(dummyLabelX.width > lbldist - 10) {
      let transf: string = 'rotate(-80,0,0)';
      this._dummyLabelXEl.setAttributeNS(null,"transform",transf);
      let bb = this._dummyLabelXEl.getBoundingClientRect();
      dummyLabelX = {width:bb.width,height:bb.height};
      this._labelRotate = true;
      transf = 'rotate(0,0,0)';
      this._dummyLabelXEl.setAttributeNS(null,"transform",transf);
    }
    this._y_axy = 10 + dummyLabelX.height + 3 + tickXL;
    // Y axis
    this._yaxis = {} as Rect; 
    this._yaxis.left = this._chartBB.left + this._x_axy;
    this._yaxis.width = 0;
    this._yaxis.top = this._chartBB.top;
    this._yaxis.height = this._chartBB.height - this._y_axy;
    let posy1:Point = {x: this._yaxis.left, y:this._yaxis.top};
    let posy2:Point = {x: this._yaxis.left + this._yaxis.width, y:this._yaxis.top + this._yaxis.height};
    axisEls = [...axisEls,
      <line id="linechart-yaxis" x1={posy1.x.toString()} y1={posy1.y.toString()} x2={posy2.x.toString()} 
       y2={posy2.y.toString()} stroke={this._prop.axColor} stroke-width="1"/>
    ];
    // center the y Axis Title
    if(this._yTitleEl) {
      const yt: number = this._chartBB.top + this._chartBB.height / 2;
      const yl: number = this._yaxis.top + this._yaxis.height / 2;
      const trans: number = Math.round(yl - yt);
      const transf: string = 'translate(0,'+ trans +')';
      this._yTitleEl.setAttributeNS(null,"transform",transf); 
    }
    let yft:number = Math.floor(parseFloat(this._prop.ftLbSize.split('px')[0])/2) - 2; // correction 2px 
    // Y grid lines
    this._nYlines = Math.abs(Math.floor(this._lenY.length / this._lenY.interval)) + 1;
    for (let i: number =0; i<this._nYlines; i++) {
      const s:number = this._lenY.top - i * Math.abs(this._lenY.interval);
      let lineId: string = "linechart-yLine"+s.toString();
      let lineStroke: string = this._prop.lnColor;
      if(i === this._nYlines - 1 ) {
        lineId = "linechart-xaxis";
        lineStroke = this._prop.axColor;
      }
      const y: number = axisConvertY(this._yaxis,this._lenY,s);
      const posxl1:Point = {x: this._yaxis.left, y:y};
      const posxl2:Point = {x: this._chartBB.left + this._chartBB.width , y:y}   
      axisEls = [...axisEls,
        <line id={lineId} x1={posxl1.x.toString()} y1={posxl1.y.toString()} x2={posxl2.x.toString()} 
         y2={posxl2.y.toString()} stroke={lineStroke} stroke-width="1"/>
      ];
      // tick
      if(tickYL > 0) {
        let postk:Point = {x: this._yaxis.left - tickYL, y: y}   
        lineId = "linechart-ytick"+s.toString();
        axisEls = [...axisEls,
          <line id={lineId} x1={posxl1.x.toString()} y1={posxl1.y.toString()} x2={postk.x.toString()} 
           y2={postk.y.toString()} stroke={lineStroke} stroke-width="1"/>
        ]; 
      }
      // label
      const labelId: string = "linechart-ylabel"+s.toString();
      let pos:Point = {x: this._yaxis.left - tickYL - 2, y: y + yft};
      axisEls = [...axisEls,
        <text x={pos.x.toString()} y={pos.y.toString()} id={labelId} font-family={this._prop.ftFamily} 
          font-size={this._prop.ftLbSize} text-anchor="end" stroke={this._prop.lbColor} 
          stroke-width="1">
          {s.toString()}
        </text> 
      ];

    }
    // X Grid Lines
    let y:number = this._yaxis.top + this._yaxis.height;
    let x: number = Math.floor(this._xInterval / 2);
    if(this._lenX.interval && this._lenX.type === 'number') x = 0;
    // center the x Axis Title
    if(this._xTitleEl) {
      const xt: number = (this._chartBB.width - this._chartBB.left) / 2;
      const xl: number = (this._chartBB.width - this._yaxis.left) / 2;
      const trans: number = - Math.round(xl - xt);
      const transf: string = 'translate('+ trans +',0)';
      this._xTitleEl.setAttributeNS(null,"transform",transf); 
    }
    yft = Math.floor(convertCSSNumber(this._prop.ftLbSize)); 
    let lineStroke: string;
    let lineId: string;  
    for (let i: number =0; i<this._nXlines; i++) {
      lineStroke = i === 0 ? this._prop.axColor : this._prop.lnColor;
      let s:number = this._lenX.bottom + i * Math.abs(this._lenX.interval);
      let posx1:Point = {x: this._yaxis.left + x, y: y} 
      // GridX Line
      if(convertCSSBoolean(this._prop.gridX)) {
        lineId = "linechart-xLine"+i.toString();
        if(this._lenX.interval && this._lenX.type === 'number') {
          lineId = "linechart-xLine"+s.toString();            
        }
        if(this._lenX.interval && this._lenX.type === 'string') {
          lineId = "linechart-xLine"+(i*this._lenX.interval).toString();            
        }
        let posx2:Point  = {x: this._yaxis.left + x, y: this._yaxis.top} 
        if(!this._lenX.interval || i >= 1 || this._lenX.type != 'number') {
          axisEls = [...axisEls,
            <line id={lineId} x1={posx1.x.toString()} y1={posx1.y.toString()} x2={posx2.x.toString()} 
             y2={posx2.y.toString()} stroke={lineStroke} stroke-width="1"/>
          ];
        }
      }
      // tick
      if(tickXL > 0) {
        let postk:Point = {x: this._yaxis.left + x, y: y + tickXL} 
        lineId = "linechart-xtick"+i.toString();
        if(this._lenX.interval && this._lenX.type === 'number') {
          lineId = "linechart-xtick"+s.toString();
        }
        if(this._lenX.interval && this._lenX.type === 'string') {
          lineId = "linechart-xtick"+(i*this._lenX.interval).toString();            
        }
        axisEls = [...axisEls,
          <line id={lineId} x1={posx1.x.toString()} y1={posx1.y.toString()} x2={postk.x.toString()} 
           y2={postk.y.toString()} stroke={lineStroke} stroke-width="1"/>
        ]; 
      }
      // label
      let labx: string;
      if(this._lenX.type === 'string') {
        let x_inter: number = typeof this._lenX.interval != "undefined" ? this._lenX.interval : 1;
        labx = this.innerData[0].dataPoints[i * x_inter][this._axisType[0]];
      } else {
        labx = s.toString();
      }
      const labelId: string = "linechart-xlabel"+labx;
      let labelAnchor: string;       
      let pos:Point;
      let transr: string = null;
      if (this._labelRotate) {
        labelAnchor = 'end';
        pos = {x: this._yaxis.left + x, y: y + tickXL + 3};
        transr = 'rotate(-80,'+pos.x+','+pos.y+')';                           
      } else {
        labelAnchor = 'middle';
        pos = {x: this._yaxis.left + x, y: y + tickXL+ yft};
        transr = 'rotate(0,'+pos.x+','+pos.y+')';                           
      }

      if( transr != null) {
        axisEls = [...axisEls,
          <text x={pos.x.toString()} y={pos.y.toString()} id={labelId} font-family={this._prop.ftFamily} 
            font-size={this._prop.ftLbSize} text-anchor={labelAnchor} stroke={this._prop.lbColor} 
            stroke-width="1" transform={transr}>
            {labx}
          </text> 
        ];  
      } else {
        axisEls = [...axisEls,
          <text x={pos.x.toString()} y={pos.y.toString()} id={labelId} font-family={this._prop.ftFamily} 
            font-size={this._prop.ftLbSize} text-anchor={labelAnchor} fill={this._prop.lbColor}>
            {labx}
          </text> 
        ];  
      }
      if(this._lenX.interval && this._lenX.type === 'string') {
        x += this._xInterval * this._lenX.interval;
      } else {
        x += this._xInterval;
      }
    }      



    return axisEls;
  }

  /**
   * Create the X-Axis Title
   *  
   */
  _createXAxisTitle(): any[] {
    let xAxisTitle: any[] = [];
    let xt: string = "50%";
    let yt: string = "0";
    let cClass:string = "notvisible";
    if(this.chartUpdate) {
      xt = Math.round(this._yTitleBB.width + this._chartBB.width / 2).toString();
      yt = this._legendRect.height > 0 && !convertCSSBoolean(this._prop.legendTop)
      ? Math.round((this._borderBB.height - this._legendRect.height - 2*this._padding - convertCSSNumber(this._prop.ftATSize))).toString()
      : Math.round((this._borderBB.height - this._padding - convertCSSNumber(this._prop.ftATSize))).toString();
      cClass = "";
    }
    xAxisTitle = [...xAxisTitle,
      <text x={xt} y={yt} id="linechart-xtitle-text" class={cClass} font-family={this._prop.ftFamily} 
        font-size={this._prop.ftATSize} text-anchor="middle" fill={this._prop.atColor}>
        {this.innerXTitle}
      </text> 
    ];
    return xAxisTitle;
  }
  /**
   * Create the Y-Axis Title
   *  
   */
  _createYAxisTitle(): any[] {
    let yAxisTitle: any[] = [];
    let xt: string = "0";
    let yt: string = "0";
    let cClass:string = "notvisible";
    let tTransform: string = `rotate(-90 0 0)`;
    if(this.chartUpdate) {
      xt = (Math.round( (convertCSSNumber(this._prop.ftATSize)+this._padding))).toString();
      yt = (Math.round(this._chartBB.top + this._chartBB.height / 2)).toString();
      cClass = "";
      tTransform = `rotate(-90 ${xt} ${yt})`;
    }

    yAxisTitle = [...yAxisTitle,
      <text x={xt} y={yt} id="linechart-ytitle-text" class={cClass} transform={tTransform} font-family={this._prop.ftFamily} 
        font-size={this._prop.ftATSize} text-anchor="middle" fill={this._prop.atColor}>
        {this.innerYTitle}
      </text> 
    ];
    return yAxisTitle;
  }
  /**
   * Draw DataSets
   *  
   */
  _createDataSets(): any[] {
    let dataSets: any[] = [];
    this._Points = [];
    for(let l:number = 0; l<this.innerData.length; l++) {
      let viewPt: Array<Point> = []; 
      let markerEls: any[]= [];
      let polylineEl: any[] = [];
      let stroke: string = this.innerData[l].color;
      let strokeWidth: string = this.innerData[l].lineThickness.toString();
      let fill: string = 'none';
      const lineId: string = `linechart-data-${l.toString()}`;
      const dataSetId: string = this.innerData[l].name 
        ? `linechart-dataset-${(this.innerData[l].name.replace(/ /g,"-")).replace(/[A-Z]/g,(match) => {return match.toLowerCase();})}`
        : `linechart-dataset-${l.toString()}`;
      let points: string ;
      this._xaxis.left = this._yaxis.left;
      this._xaxis.width = this._chartBB.left + this._chartBB.width - this._xaxis.left; 
      let x: number = Math.floor(this._xInterval / 2);
      for (let i: number =0; i<this.innerData[l].dataPoints.length; i++) {
        stroke = this.innerData[l].dataPoints[i].color ? this.innerData[l].dataPoints[i].color :this.innerData[l].color;
        let pt: Point = {} as Point;
        pt.y = axisConvertY(this._yaxis,this._lenY,this.innerData[l].dataPoints[i].y);
        if(this._lenX.interval && this._lenX.type === 'number') {
          pt.x = axisConvertX(this._xaxis,this._lenX,this.innerData[l].dataPoints[i].x);
        } else {
            pt.x = this._xaxis.left + x;
        }
        viewPt.push(pt);
        let scale = this.innerData[l].markerSize / 10;
        if(this.innerData[l].markerType != "none") {
          // draw marker
          markerEls = [...markerEls,
            this._placeMarker("marker-"+this.innerData[l].markerType,pt,l,i,scale,this.innerData[l].markerColor)];
          }
        if (i === 0) {
          points = pt.x.toString()+','+pt.y.toString();
        } else {
          points += ' ' + pt.x.toString()+','+pt.y.toString();
        }
        x += this._xInterval;
      }
      let length: number = getTotalLength(viewPt);
      if(length > 0 ) {
        if(this.innerData[l].type === 'line') {
          // draw polyline
          if(!this.innerAnimation) {
            polylineEl = [...polylineEl,
              <polyline id={lineId} class= "linechart-data" points={points} fill={fill} stroke={stroke} stroke-width={strokeWidth}
                stroke-linejoin="round" stroke-linecap="round" stroke-miterlimit="10">
              </polyline>
            ];

          } else {
            polylineEl = [...polylineEl,
              <polyline id={lineId} class= "linechart-data" points={points} fill={fill} stroke={stroke} stroke-width={strokeWidth}
              stroke-linejoin="round" stroke-linecap="round" stroke-miterlimit="10"
              stroke-dasharray={`${length.toString()} ${length.toString()}`}
              stroke-dashoffset={length.toString()}>
                <animate class= "linechart-data-animate" attributeName="stroke-dashoffset" from={length.toString()}
                to="0" dur={this._prop.animDuration} fill="freeze">
                </animate>
              </polyline>
            ];

          }

        }
      } else {
        // case One Point in DataSet
        strokeWidth = "2";
        fill = stroke;
        const fillOpacity: string = "0.75";
        polylineEl = [...polylineEl,
          <circle id={lineId} class= "linechart-data" cx={(viewPt[0].x).toString()} cy={(viewPt[0].y).toString()} r="10"
            stroke={stroke} stroke-width={strokeWidth} fill={fill} fill-opacity={fillOpacity}>
          </circle>
        ];
      }
      this._Points.push(viewPt);
      dataSets = [...dataSets,
        <g id={dataSetId} class="linechart-dataset">
          {markerEls}
          {polylineEl}
        </g>
      ];
    }
    return dataSets;
  }
  /**
   * Draw Markers
   *  
   */
  _placeMarker(id:string,pt:Point,line:number,index:number,scale:number,color:string): any[] {
    let markers: any[] = [];
    let transform: string;
    if(scale != 1) {
      const s: number = 1 - scale;
      const trans: Point = {} as Point;
      trans.x = s*pt.x;
      trans.y = s*pt.y;
      transform = `translate(${trans.x.toString()},${trans.y.toString()}) scale(${scale})`;
    
    } else {
      transform = "translate(0,0) scale(1)"
    }
    markers = [...markers,
      <g id={`${id}-g-${line.toString()}-${index.toString()}`} class={`marker ${id}`} fill={color}>
        <use class="marker-use" xlinkHref={`#${id}`} id={`${id}-${line.toString()}-${index.toString()}`} 
          x={(pt.x - 5).toString()} y={(pt.y - 5).toString()} width="10" height="10"
          transform={transform}>

        </use>
      </g>
    ];
    return markers;
  }
  /**
   * Draw Legend
   *  
   */
  _createLegend(): any[] {
    let legendEls: any[] = [];
    let itemsPlaced: number = 0;
    let pos1: Point;
    let pos2 :Point;
    let pos3: Point;
    let yLine: number = this._legendRect.top;
    for(let i:number = 0; i < this._legend.nLines; i++) {
        for(let j:number = 0; j < this._legend.nItems;j++) {
            if (j===0) {
                pos1 = {x: this._borderBB.width/ 2 - this._legend.lineLength/2, y: yLine};
            } else {
                pos1 = {x: pos1.x + this._legend.bBoxItem.width + 20, y: pos1.y};
            }
            pos2 = {x: pos1.x + 15,y: pos1.y};
            pos3 = {x: pos1.x + 20,y: pos1.y};

            legendEls = [...legendEls,
              <line x1={(pos1.x).toString()} y1={(pos1.y).toString()} x2={(pos2.x).toString()} 
              y2={(pos2.y).toString()} stroke={this._legendColors[itemsPlaced]} 
              stroke-width={this._legendThicknesses[itemsPlaced].toString()}>
              </line>
            ];
            legendEls = [...legendEls,
              <text x={(pos3.x).toString()} y={(pos3.y).toString()} font-family={this._prop.ftFamily} 
              font-size={this._prop.ftLgSize} text-anchor="start">
              {this._legendNames[itemsPlaced]}
              </text> 
            ];                           
            itemsPlaced += 1;
            if(itemsPlaced >= this._legendNames.length) break;
        }
        yLine += this._legend.bBoxItem.height + 2;
    }

    return legendEls;
  }
  /**
   * Draw Dummy Label for label size calculation
   *  
   */
  _createDummyLabel(lenA:AxisLength,axis:string): any[] {
    let dummyLabeleEl: any[] = []; 
    let max:string;
    if(lenA.label) {
      max = lenA.label;
    } else {
      max = lenA.top.toString();
      let min:string = lenA.bottom.toString();
      if(min.length > max.length) max = min;  
    }
    let y:number = 0;
    let x:number = 0;
    dummyLabeleEl = [...dummyLabeleEl,
      <text x={x} y={y} id={`linechart-label-${axis}`} class="notvisible" font-family={this._prop.ftFamily} 
        font-size={this._prop.ftLbSize} text-anchor="start" fill={this._prop.lbColor}>
        {max}
      </text> 
    ];  
    return dummyLabeleEl;

  }
  /**
   * Draw Dummy Legend Item for legend size calculation
   *  
   */

  _createDummyLegendItem(name:string): any[] {
    let dummyLegendItemEls: any[] = []; 

    const pos1: Point = {x:0,y:0};             
    const pos2: Point = {x:15,y:0}; 
    const pos3: Point ={x:20,y:0};            
    dummyLegendItemEls = [...dummyLegendItemEls,
      <line x1={(pos1.x).toString()} y1={(pos1.y).toString()} x2={(pos2.x).toString()} 
        y2={(pos2.y).toString()} id={`linechart-dummy-legend-line`} class="notvisible" stroke="#000000">
      </line>
    ];
    dummyLegendItemEls = [...dummyLegendItemEls,
      <text x={pos3.x} y={pos3.y} id={`linechart-dummy-legend-text`} class="notvisible" font-family={this._prop.ftFamily} 
        font-size={this._prop.ftLgSize} text-anchor="start">
        {name}
      </text> 
    ];  

    return dummyLegendItemEls;
  }

  async _getLegendInfo(): Promise<Legend> {
    let legend: Legend = {} as Legend;
    legend.bBoxItem = this._dummyLegendItemEl
      ? await getBoundingClientRect(this._dummyLegendItemEl, this.innerDelay)
      : {top:0,left:0,width:0,height:0,bottom:0,right:0};
    // calculate number of legend items per legend line
    legend.nItems = Math.floor((this._borderBB.width - 20)/(legend.bBoxItem.width + 20));
    if(legend.nItems > this._legendNames.length) legend.nItems = this._legendNames.length;
    // calculate legend lines length
    legend.lineLength = legend.nItems * (legend.bBoxItem.width + 20);
    // calculate number of legend lines
    legend.nLines = Math.ceil(this._legendNames.length / legend.nItems);
    legend.bBox = {} as ClientRect;
    legend.bBox.top = 0;
    legend.bBox.left = 0;
    legend.bBox.width = legend.lineLength - 20;
    legend.bBox.height = legend.bBoxItem.height * legend.nLines + 
    2 * (legend.nLines - 1);

    return legend;
  }
  /* ---- Deal with window resize  */

  async _windowResize() {
    await this.renderChart();
    this.toggle = !this.toggle;
  }

  /* ---- Deal with handling event  */
  _handleTouchDown(evt) {
    evt.preventDefault();
    this._mouseStart = true;
    let pt:Point = {x: evt.touches[0].pageX, y: evt.touches[0].pageY}
    this._handleEventTarget(evt, pt);
  }
  _handleMouseDown(evt) {
    evt.preventDefault();
    this._mouseStart = true;
    let pt:Point = {x: evt.pageX, y: evt.pageY}
    this._handleEventTarget(evt, pt);
  }
  _handleTouchUp(evt) {
    evt.preventDefault();
//    this._waitRemoveLabel();
  }
  _handleMouseUp(evt) {
    evt.preventDefault();
//    this._waitRemoveLabel();
  }

  _handleEventTarget(evt,pt:Point): void {
    this._showTarget = evt.target;
    // if a label exists remove it
    pt.x -= this._borderBB.left;
    pt.y -= this._borderBB.top;
/*
    this._removeLabel(this.svg); 
    let nearestPoint: NearestPoint = getNearest(this._Points,pt);
    let data: any = this.innerData[nearestPoint.line].dataPoints[nearestPoint.index];
    let mName:string = "#marker-"+this.innerData[nearestPoint.line].markerType+'-';
    mName += nearestPoint.line.toString()+'-'+nearestPoint.index.toString();
    this._selMarker.push(mName);
    let marker : SVGElement = this.svg.querySelector(mName);
    this._highlightMarker(marker,false);
    let label: string;
    if(typeof data.x === 'number') label = data.x.toString();
    if(this._label) label = data.label;
    if(!this._label && typeof data.x === 'string') label = data.x;
    label = label + " : " + data.y.toString();
    let ft:number = 1.2*parseFloat(this._prop.ftLbSize.split('px')[0]);
    let opt:SVGOptions = {
      fontFamily: this._prop.ftFamily,
      fontSize: ft.toString()+'px',
      fill: this._prop.lbColor,
      anchor: "middle"
    };
    let color:string = this.innerData[nearestPoint.line].color;
    createLineLabel(this.svg,label,nearestPoint,color,opt);
*/
  }


  /* ---- Deal with rendering  */

  async _renderChart() {
    if(this._status.status === 200) {
      this._container = this._element.querySelector('#div-linechart-container');
      this._svg = this._element.querySelector('#svg-linechart');
      this._borderEl = this._svg.querySelector('#svg-border-rect');
      this._titleEl = this._svg.querySelector('#linechart-title');
      this._axesEl = this._svg.querySelector('#linechart-axes');
      this._legendEl = this._svg.querySelector('#linechart-legend');
      this._yTitleEl = this._svg.querySelector('#linechart-ytitle');
      this._xTitleEl = this._svg.querySelector('#linechart-xtitle');
      this._dataEl = this._svg.querySelector('#linechart-data');
      this._dummyLabelXEl = this._svg.querySelector('#linechart-label-x');
      this._dummyLabelYEl = this._svg.querySelector('#linechart-label-y');
      this._dummyLegendItemEl = this._svg.querySelector('#linechart-dummy-legend-item');

      this._borderBB = this._borderEl
        ? await getBoundingClientRect(this._borderEl, this.innerDelay)
        : {top:0,left:0,width:0,height:0,bottom:0,right:0};
      this._titleBB = this._titleEl
        ? await getBoundingClientRect(this._titleEl, this.innerDelay)
        : {top:0,left:0,width:0,height:0,bottom:0,right:0};
      const titleWidth: number = this._titleBB
        ? Math.ceil(this._titleBB.width) 
        : 0;
      if(titleWidth !=0) this.el.style.setProperty('--min-width',`${titleWidth}px`);
      // calculate the label size
      let lbsize: ClientRect = this._dummyLabelYEl
        ? await getBoundingClientRect(this._dummyLabelYEl, this.innerDelay)
        : {top:0,left:0,width:0,height:0,bottom:0,right:0};
      this._dummyLabelY = {width: lbsize.width, height: lbsize.height};
      lbsize = this._dummyLabelXEl
        ? await getBoundingClientRect(this._dummyLabelXEl, this.innerDelay)
        : {top:0,left:0,width:0,height:0,bottom:0,right:0};
      this._dummyLabelX = {width: lbsize.width, height: lbsize.height};


      this._chartBB.top = Math.round(this._titleBB.height + 2 * this._padding) + 1;
      if(this.innerData.length > 1 ) {
        if(this._legendEl.classList.contains('hidden')) this._legendEl.classList.remove('hidden');
        this._legend = await this._getLegendInfo();
        this._legendRect.left = this._legend.bBox.left;
        this._legendRect.width = this._legend.bBox.width;
        if(convertCSSBoolean(this._prop.legendTop)) {
          this._legendRect.top = this._chartBB.top + this._padding;
          this._chartBB.top += Math.ceil(this._legend.bBox.height) + this._padding;
        } else {
          this._legendRect.top = Math.floor(this._borderBB.height - this._legend.bBox.height - this._padding);
        }  
        this._legendRect.height = this._legend.bBox.height;
      } else {
        if(!this._legendEl.classList.contains('hidden')) this._legendEl.classList.add('hidden');
        this._legendRect = {top:0,left:0,width:0,height:0};
      }
      this._xTitleBB = this._xTitleEl
      ? await getBoundingClientRect(this._xTitleEl, this.innerDelay)
      : {top:0,left:0,width:0,height:0,bottom:0,right:0};
  
      this._yTitleBB = this._yTitleEl 
        ? await getBoundingClientRect(this._yTitleEl, this.innerDelay)
        : {top:0,left:0,width:0,height:0,bottom:0,right:0};

      this._chartBB.left = Math.round(this._yTitleBB.width + this._padding) + 1;
      this._chartBB.height = this._legendRect.height > 0 && !convertCSSBoolean(this._prop.legendTop)
      ? Math.round(this._borderBB.height - this._legendRect.height - this._xTitleBB.height - this._chartBB.top - 2*this._padding) - 1
      : Math.round(this._borderBB.height - this._xTitleBB.height - this._chartBB.top - this._padding) - 1;
      this._chartBB.width = Math.round(this._borderBB.width - 2*this._padding - this._chartBB.left) - 1;
  
      if(this._borderBB.top != 0 || this._borderBB.left != 0 || this._borderBB.width != 0 || this._borderBB.height != 0) {
        this._container.addEventListener('touchstart',this._handleTouchDown.bind(this),false)
        this._container.addEventListener('touchend',this._handleTouchUp.bind(this),false)
        this._container.addEventListener('mousedown',this._handleMouseDown.bind(this),false)
        this._container.addEventListener('mouseup',this._handleMouseUp.bind(this),false)
        if(this.innerBorder) {
          this._borderEl.classList.remove('notvisible');
        }
      }
      this.chartUpdate = true;
      this.readyLinechart.emit();

    }        
  }

  render() {
    let titleEls: any[] = [];
    let axisEls: any[] = [];
    let xAxisTitleEl: any[] = [];
    let yAxisTitleEl: any[] = [];
    let dataEls: any[] = [];
    let legendEls: any[] = [];
    let xDummyLabelEl: any[] = [];
    let yDummyLabelEl: any[] = [];
    let dummyLegendItemEls: any[] = [];
    
    if(this._status.status === 200) {

      /* create the dummy label X to calculate the size */

      const intervalX: number  = parseFloat(this._prop.xInterval);
      if(this._label) {
        this._lenX = axisRange(this.innerData,"label",intervalX);
      } else {
        this._lenX = axisRange(this.innerData,"x",intervalX,convertCSSBoolean(this._prop.xZero));
      }
      xDummyLabelEl = this._createDummyLabel(this._lenX,"x");

      /* create the dummy label Y to calculate the size */

      const intervalY: number  = parseFloat(this._prop.yInterval);
      this._lenY = axisRange(this.innerData,"y",intervalY,convertCSSBoolean(this._prop.yZero));
      yDummyLabelEl = this._createDummyLabel(this._lenY,"y");

      /* create a dummy legend item to calculate the size */
      // get the legendNames of max characters
      const maxName: string = this._legendNames.reduce((a,b) => {return a.length > b.length ? a : b; });
      dummyLegendItemEls = this._createDummyLegendItem(maxName);
      /* create the title */

      if(this.innerTitle != null) {
        titleEls = this._createTitle();
      }

      /* create the legend */

      if(this.chartUpdate && this.innerData.length > 1) {
        legendEls = this._createLegend();
      }

      /* create axes */
      
      if(this.chartUpdate) axisEls = this._createAxes();

      /* create X-axis title */

      if(this.innerXTitle != null) {
        xAxisTitleEl = this._createXAxisTitle();
      }

      /* create Y-axis title */

      if(this.innerYTitle != null) {
        yAxisTitleEl = this._createYAxisTitle();
      }

      /* create Data Sets */
      if(this.chartUpdate) dataEls = this._createDataSets();
    }

    let toRender: any[] = [];
    if(this._status.status === 200) {
        toRender = [...toRender,
            <div id="div-linechart-container">
              <svg id="svg-linechart" width="100%" height="100%">
                <rect id="svg-border-rect" class="border-rect notvisible" x="0" y="0" width="100%" height="100%" 
                  stroke={this._prop.bdColor} stroke-width={this._prop.bdWidth} fill="none" fill-opacity="0"/>
                <defs>
                  <g id="marker-circle">
                    <path d="M0,5 A5,5 0 1,1 10,5 A5,5 0 0,1 0,5 Z"></path>
                  </g>
                  <g id="marker-square">
                    <path d="M0,0 L10,0 L10,10 L0,10 Z"></path>
                  </g>
                  <g id="marker-triangle">
                    <path d="M5,0 L10,10 L0,10 Z"></path>
                  </g>
                  <g id="marker-cross">
                    <path d="M0,2 L2,0 L5,3 L8,0 L10,2 L7,5 L10,8 L8,10 L5,7 L2,10 L0,8 L3,5 Z"></path>
                  </g>
                  <g id="marker-plus">
                    <path d="M0,4 L4,4 L4,0 L6,0 L6,4 L10,4 L10,6 L6,6 L6,10 L4,10 L4,6 L0,6 Z"></path>
                  </g>
                </defs>
                <g id="linechart-dummy-labels" class="notvisible">
                  {xDummyLabelEl}
                  {yDummyLabelEl}
                </g>
                <g id="linechart-dummy-legend-item" class="notvisible">
                 {dummyLegendItemEls} 
                </g>
                <g id="linechart-title">
                  {titleEls}
                </g> 
                <g id="linechart-axes">
                  {axisEls}
                </g> 
                <g id="linechart-legend" class="hidden">
                  {legendEls}
                </g> 
                <g id="linechart-ytitle">
                  {yAxisTitleEl}
                </g> 
                <g id="linechart-xtitle">
                  {xAxisTitleEl}
                </g> 
                <g id="linechart-data">
                  {dataEls}
                </g>
              </svg>
            </div>
        ];
    } else {
        toRender = [...toRender,
          <div id="div-error-message">
            <p id="p-error-message">{this._status.message}</p>
          </div>        
        ];
    }
    return (
      <Host>{toRender}</Host>
    )      
  }
}
