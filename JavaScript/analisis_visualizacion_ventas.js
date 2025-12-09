// script.js - Panel de control para visualización (Google Charts + D3)
// Autora: Elizabeth Durán Leyva 

let currentSource = 'data.json'; // Alterna a data_update.json al actualizar
const updateBtn = document.getElementById('updateBtn');
const statusSpan = document.getElementById('status');

google.charts.load('current', {packages:['corechart']});
google.charts.setOnLoadCallback(()=> {
  // Carga inicial después de que Google Charts esté listo
  loadAndRender();
});

updateBtn.addEventListener('click', ()=> {
  // Alterna la fuente entre data.json y data_update.json para simular actualización dinámica
  currentSource = (currentSource === 'data.json') ? 'data_update.json' : 'data.json';
  statusSpan.textContent = 'Fuente: ' + currentSource;
  loadAndRender(true);
});

// Carga el JSON y dibuja ambos gráficos; si animate=true, activa transiciones en D3
async function loadAndRender(animate=false){
  try{
    const resp = await fetch(currentSource, {cache: "no-store"});
    const data = await resp.json();
    // Prepara datos agregados para Google Chart
    const months = [...new Set(data.map(d=>d.mes))]; // ['Enero','Febrero']
    const products = [...new Set(data.map(d=>d.producto))]; // ['Smartphone A',...]
    // Construye cabecera: ['Mes','Smartphone A','Smartphone B','Tablet X']
    const header = ['Mes', ...products];
    const rows = months.map(m=>{
      const row = [m];
      products.forEach(p=>{
        const item = data.find(d=>d.mes===m && d.producto===p);
        row.push(item ? item.ventas : 0);
      });
      return row;
    });
    drawColumnChart([header, ...rows]);
    drawBubbleChart(data, animate);
  }catch(err){
    console.error('Error obteniendo datos', err);
    alert('Error cargando datos: ' + err.message);
  }
}

/* ---------------- Google ColumnChart (Gráfico de columnas de Google) ---------------- */
function drawColumnChart(arrayData){
  const data = google.visualization.arrayToDataTable(arrayData);
  const options = {
    title: 'Ventas por mes y producto',
    legend: { position: 'top' },
    animation: { duration: 600, easing: 'out' },
    height: 360,
    vAxis: { title: 'Ventas' },
    hAxis: { title: 'Mes' },
    chartArea: { left:60, right:20, top:60, bottom:60 },
    colors: ['#2b6cb0','#38a169','#7f7fd5']
  };
  const chart = new google.visualization.ColumnChart(document.getElementById('columnchart'));
  chart.draw(data, options);
}

/* ---------------- D3 Bubble Chart (Gráfico de burbujas D3) ---------------- */
function drawBubbleChart(dataset, animate=false){
  // Prepara el contenedor
  const container = document.getElementById('bubblechart');
  container.innerHTML = '';
  const width = container.clientWidth || 600;
  const height = 360;
  const margin = {top:20,right:20,bottom:40,left:60};

  const svg = d3.select(container).append('svg')
    .attr('width', width)
    .attr('height', height);

  // Escalas
  const x = d3.scaleLinear()
    .domain([d3.min(dataset, d=>d.precio)*0.9, d3.max(dataset, d=>d.precio)*1.1])
    .range([margin.left, width - margin.right]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(dataset, d=>Math.max(d.ventas, d.ingresos/100))*1.15])
    .range([height - margin.bottom, margin.top]);

  const r = d3.scaleSqrt()
    .domain([0, d3.max(dataset, d=>d.ingresos)])
    .range([6, 34]);

  const color = d3.scaleOrdinal()
    .domain([...new Set(dataset.map(d=>d.producto))])
    .range(['#4f46e5','#10b981','#f59e0b']);

  // Ejes
  const xAxis = d3.axisBottom(x).ticks(5);
  const yAxis = d3.axisLeft(y).ticks(6);

  svg.append('g')
    .attr('transform', `translate(0,${height - margin.bottom})`)
    .call(xAxis)
    .append('text')
    .attr('x', width - margin.right)
    .attr('y', -8)
    .attr('fill','#333')
    .attr('text-anchor','end')
    .text('Precio');

  svg.append('g')
    .attr('transform', `translate(${margin.left},0)`)
    .call(yAxis)
    .append('text')
    .attr('transform','rotate(-90)')
    .attr('x', -margin.top)
    .attr('y', 12)
    .attr('fill','#333')
    .attr('text-anchor','end')
    .text('Ventas / (Ingresos/100)');

  // Tooltip (cuadro informativo)
  const tooltip = d3.select('body').append('div')
    .attr('class','tooltip')
    .style('opacity',0);

  // Asocia los datos
  const nodes = svg.selectAll('circle')
    .data(dataset, d => d.producto + '_' + d.mes);

  // SALIDA (elimina elementos antiguos)
  nodes.exit().transition().duration(500).attr('r',0).remove();

  // ENTRADA (agrega nuevos elementos)
  const enter = nodes.enter().append('circle')
    .attr('cx', d=>x(d.precio))
    .attr('cy', d=>y(d.ventas))
    .attr('r', 0)
    .attr('fill', d=>color(d.producto))
    .attr('stroke','#fff')
    .attr('stroke-width',1.5)
    .style('cursor','pointer')
    .on('mouseover', function(event,d){
      d3.select(this).attr('stroke','#000').attr('stroke-width',2);
      tooltip.transition().duration(120).style('opacity',1);
      tooltip.html(`<strong>${d.producto} — ${d.mes}</strong><br/>Ventas: ${d.ventas}<br/>Ingresos: $${d.ingresos}<br/>Precio: $${d.precio}`)
        .style('left', (event.pageX) + 'px')
        .style('top', (event.pageY - 10) + 'px');
    })
    .on('mousemove', function(event){
      tooltip.style('left', (event.pageX) + 'px').style('top', (event.pageY - 10) + 'px');
    })
    .on('mouseout', function(){
      d3.select(this).attr('stroke','#fff').attr('stroke-width',1.5);
      tooltip.transition().duration(200).style('opacity',0);
    })
    .on('click', function(event,d){
      // al hacer clic, alterna la selección y resalta
      const selected = d3.select(this).classed('selected');
      d3.selectAll('circle').classed('faded', false).transition().duration(300).style('opacity',1);
      if(!selected){
        d3.selectAll('circle').filter(dd => dd.producto !== d.producto).classed('faded', true).transition().duration(300).style('opacity',0.25);
        d3.select(this).classed('selected', true).transition().duration(300).attr('stroke','#000').attr('stroke-width',3);
      } else {
        d3.selectAll('circle').classed('faded', false).transition().duration(300).style('opacity',1);
        d3.select(this).classed('selected', false).transition().duration(300).attr('stroke','#fff').attr('stroke-width',1.5);
      }
    });

  // ACTUALIZA y combina con ENTRADA
  enter.merge(nodes)
    .transition()
    .duration(animate ? 800 : 400)
    .attr('cx', d=>x(d.precio))
    .attr('cy', d=>y(d.ventas))
    .attr('r', d=>r(d.ingresos));

  // Agrega etiquetas para cada punto (pequeñas)
  const labels = svg.selectAll('text.lbl')
    .data(dataset, d => d.producto + '_' + d.mes);

  labels.exit().remove();

  labels.enter().append('text')
    .attr('class','lbl')
    .attr('x', d=>x(d.precio))
    .attr('y', d=>y(d.ventas))
    .attr('dy', d=> - (r(d.ingresos) + 6))
    .attr('text-anchor','middle')
    .style('font-size','11px')
    .style('fill','#222')
    .text(d=>d.mes)
    .merge(labels)
    .transition()
    .duration(animate ? 800 : 400)
    .attr('x', d=>x(d.precio))
    .attr('y', d=>y(d.ventas))
    .attr('dy', d=> - (r(d.ingresos) + 6))
    .text(d=>d.mes);
}