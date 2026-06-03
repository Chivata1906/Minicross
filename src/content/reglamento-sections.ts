export interface ReglamentoTable {
  headers: string[];
  rows: string[][];
}

export interface ReglamentoSection {
  id: string;
  title: string;
  paragraphs?: string[];
  paragraphsAfter?: string[];
  bullets?: string[];
  table?: ReglamentoTable;
  subsections?: { title: string; bullets: string[] }[];
}

export const REGLAMENTO_SECTIONS: ReglamentoSection[] = [
  {
    id: 'generalidades',
    title: '1. Generalidades',
    paragraphs: [
      'El Campeonato Junior Minicross Colombia es un campeonato privado de formación deportiva enfocado en el desarrollo infantil y juvenil del motocross, inspirado en el formato norteamericano de competencias amateur tipo "Mini O\'s".',
      'El campeonato tiene como objetivo fomentar el crecimiento progresivo de nuevos pilotos, priorizando la seguridad, el aprendizaje deportivo, la igualdad competitiva y la proyección deportiva de niños y jóvenes dentro del motocross.',
      'El campeonato contará con reglamentación propia y será administrado exclusivamente por la organización del evento.',
      'Todos los pilotos, padres de familia, acompañantes, mecánicos y equipos participantes aceptan el presente reglamento desde el momento de realizar la inscripción.',
      'La organización podrá realizar modificaciones técnicas, deportivas o logísticas cuando sea necesario para garantizar la seguridad, el correcto desarrollo del evento o el equilibrio deportivo.',
    ],
  },
  {
    id: 'categorias',
    title: '2. Categorías oficiales',
    paragraphs: [
      'Las categorías estarán determinadas por edad y cilindrada de la motocicleta.',
      'La edad mínima será considerada al primer día del campeonato y la edad máxima será la edad cumplida por el piloto al 1 de enero del año correspondiente.',
      'La organización podrá solicitar documento de identidad para validar la edad del piloto.',
      'La organización podrá unificar categorías cuando el número de pilotos inscritos no permita conformar mangas independientes, manteniendo clasificación y premiación separada.',
    ],
    table: {
      headers: ['Categoría', 'Edad'],
      rows: [
        ['50cc', '4 a 6 años'],
        ['50cc', '6 a 8 años'],
        ['65cc', '7 a 9 años'],
        ['65cc', '8 a 10 años'],
        ['85cc', '9 a 11 años'],
        ['85cc', '11 a 13 años'],
        ['125cc Junior', '12 a 17 años'],
      ],
    },
  },
  {
    id: 'motocicletas',
    title: '3. Motocicletas permitidas',
    subsections: [
      {
        title: '50cc',
        bullets: [
          'Motocicletas automáticas de 2 tiempos hasta 50cc.',
          'Permitidas motocicletas eléctricas equivalentes autorizadas por la organización.',
          'Para la categoría 50cc (4-6 años), las motocicletas deberán conservar configuración original de fábrica, rin 10 delantero y trasero.',
          'Se prohíben modificaciones extremas de motor, chasis o suspensión.',
          'La organización podrá limitar motocicletas que considere excesivamente modificadas para la categoría infantil.',
        ],
      },
      {
        title: '65cc',
        bullets: ['Motocicletas 2 tiempos desde 55cc hasta 65cc.'],
      },
      {
        title: '85cc',
        bullets: [
          'Motocicletas 2 tiempos desde 75cc hasta 85cc.',
          'Rin delantero 17" o 19".',
          'Rin trasero 14" o 16".',
        ],
      },
      {
        title: '125cc Junior',
        bullets: [
          'Motocicletas 2 tiempos hasta 125cc.',
          'Motocicletas 4 tiempos hasta 250cc.',
        ],
      },
    ],
    paragraphsAfter: [
      'La organización y el director técnico podrán rechazar cualquier motocicleta que represente riesgo para el piloto o para los demás participantes.',
      'Toda motocicleta deberá encontrarse en condiciones óptimas de seguridad.',
    ],
  },
  {
    id: 'numeros',
    title: '4. Números',
    bullets: [
      'Todos los pilotos deberán portar número negro con fondo blanco visible en las tres placas reglamentarias de la motocicleta.',
      'El jersey o la pechera deberá estar marcado en la parte posterior con el número del piloto.',
      'La organización podrá asignar o reservar números oficiales.',
      'No se permitirán números repetidos dentro de la misma categoría.',
    ],
  },
  {
    id: 'competencia',
    title: '5. Sistema de competencia',
    bullets: [
      'El campeonato se desarrollará bajo formato acumulativo de tres (3) mangas por categoría.',
      'Cada manga otorgará puntos independientes y la sumatoria total determinará la clasificación general del evento.',
      'Todas las mangas tendrán igual valor en puntuación.',
      'El piloto ganador del evento será quien obtenga la mayor cantidad de puntos al finalizar las tres mangas.',
      'En caso de empate en puntos, se tomará como criterio de desempate: (1) mejor resultado en la tercera manga, (2) mejor resultado en la segunda manga, (3) mejor clasificación en cronometraje.',
      'La organización podrá modificar el número de mangas por condiciones climáticas, seguridad o fuerza mayor.',
    ],
  },
  {
    id: 'puntuacion',
    title: '6. Sistema de puntuación',
    paragraphs: [
      'La puntuación oficial será la siguiente:',
      'Todo piloto que tome la salida oficial de una manga será considerado participante oficial de la misma.',
    ],
    table: {
      headers: ['Posición', 'Puntos'],
      rows: [
        ['1', '25'],
        ['2', '22'],
        ['3', '20'],
        ['4', '18'],
        ['5', '16'],
        ['6', '15'],
        ['7', '14'],
        ['8', '13'],
        ['9', '12'],
        ['10', '11'],
        ['11', '10'],
        ['12', '9'],
        ['13', '8'],
        ['14', '7'],
        ['15', '6'],
        ['16', '5'],
        ['17', '4'],
        ['18', '3'],
        ['19', '2'],
        ['20', '1'],
      ],
    },
  },
  {
    id: 'clasificacion',
    title: '7. Clasificación y orden de partida',
    bullets: [
      'El día sábado se realizarán prácticas libres oficiales para todas las categorías.',
      'El día domingo la clasificación será por sorteo.',
      'El sorteo definirá el orden del partidor para la primera manga.',
      'La segunda y tercera manga el orden se define con los resultados de la primera manga.',
      'Dependiendo del número de pilotos inscritos, el director de carrera podrá dividir grupos cuando exista exceso de participantes.',
    ],
  },
  {
    id: 'salida',
    title: '8. Procedimiento de salida',
    bullets: [
      '15 minutos antes de la manga se abrirá zona de espera.',
      '5 minutos antes únicamente permanecerá un mecánico por piloto.',
      '2 minutos antes se autoriza encendido de motocicletas.',
      '15 segundos oficiales.',
      '5 segundos oficiales.',
      'Descenso de partidor.',
      'Una vez el piloto ingrese a la grilla no podrá cambiar de posición ni recibir asistencia.',
      'Toda salida falsa será señalizada con bandera roja.',
    ],
  },
  {
    id: 'duracion',
    title: '9. Duración de las mangas',
    table: {
      headers: ['Categoría', 'Duración'],
      rows: [
        ['50cc', '8 min + 1 vuelta'],
        ['65cc', '10 min + 1 vuelta'],
        ['85cc', '12 min + 1 vuelta'],
        ['125cc', '15 min + 1 vuelta'],
      ],
    },
    paragraphs: [
      'La organización podrá modificar los tiempos de competencia por condiciones climáticas, seguridad o programación del evento.',
    ],
  },
  {
    id: 'asistencia',
    title: '10. Asistencia en pista',
    bullets: [
      'Las categorías 50cc podrán recibir asistencia externa únicamente en caso de caída o inmovilización de la motocicleta.',
      'La asistencia deberá realizarse exclusivamente por un adulto acreditado con chaleco oficial suministrado por la organización.',
      'Está prohibido empujar al piloto para generar ventaja deportiva.',
      'Para las categorías 65cc y superiores no estará permitida asistencia externa, salvo autorización expresa del director de carrera por razones de seguridad y/o climáticas.',
      'Para la categoría 65cc se permitirá un acompañante por razones climáticas.',
      'Toda conducta antideportiva relacionada con asistencia externa podrá generar sanción.',
    ],
  },
  {
    id: 'seguridad-equipo',
    title: '11. Equipo de seguridad obligatorio',
    paragraphs: ['Será obligatorio para todos los pilotos:'],
    bullets: [
      'Casco homologado para motocross.',
      'Gafas de protección.',
      'Pechera.',
      'Rodilleras.',
      'Botas de motocross.',
      'Guantes.',
      'Uniforme manga larga.',
      'Jersey marcado en la parte posterior.',
      'No se permitirá participación con equipamiento incompleto.',
      'La organización podrá impedir la participación de cualquier piloto cuyo equipamiento represente riesgo.',
    ],
  },
  {
    id: 'conducta',
    title: '12. Comportamiento de padres y acompañantes',
    paragraphs: [
      'El campeonato busca promover un ambiente deportivo sano, formativo y respetuoso.',
      'Todo padre de familia, acompañante, mecánico o integrante de equipo deberá mantener conducta respetuosa hacia pilotos, organizadores, oficiales, jueces, personal médico y otros equipos participantes.',
      'No se permitirán: agresiones verbales, amenazas, conductas antideportivas, invasión de pista ni discusiones con oficiales durante las competencias.',
      'El piloto será responsable por el comportamiento de sus acompañantes.',
      'La organización podrá expulsar personas o descalificar pilotos cuando considere que una conducta afecta el desarrollo del evento.',
    ],
  },
  {
    id: 'seguridad-pista',
    title: '13. Seguridad en pista',
    paragraphs: ['La organización contará con:'],
    bullets: [
      'Oficiales de pista.',
      'Personal médico.',
      'Ambulancia.',
      'Sistema oficial de banderas.',
      'Zona de mecánicos.',
      'Zona de espera.',
      'Todos los pilotos deberán respetar las señales oficiales.',
    ],
    subsections: [
      {
        title: 'Significado de las banderas',
        bullets: [
          'Bandera verde: pista libre y competencia en condiciones normales.',
          'Bandera amarilla: peligro en pista. Está prohibido adelantar y saltar en la zona señalizada.',
          'Bandera roja: suspensión inmediata de la manga o práctica. Todos los pilotos deberán disminuir velocidad y dirigirse de forma segura a la zona indicada por los oficiales.',
          'Bandera azul: un piloto más rápido intentará adelantar. El piloto alcanzado será al que se le muestre la bandera.',
          'Bandera negra: descalificación o sanción directa al piloto señalado. El piloto deberá abandonar la pista y dirigirse inmediatamente a pits.',
          'Bandera a cuadros: finalización oficial de la manga o práctica.',
          'El director de carrera podrá detener una manga por razones de seguridad.',
          'Si una manga es detenida antes de completarse el 50% del tiempo programado, podrá reiniciarse.',
          'Si la manga supera el 50% del tiempo oficial, podrá considerarse válida.',
        ],
      },
    ],
  },
  {
    id: 'ambiental',
    title: '14. Reglas ambientales',
    bullets: [
      'Todos los equipos deberán mantener limpia su zona de pits.',
      'Cada piloto deberá utilizar alfombra ambiental en la zona de mecánica.',
      'Cada equipo deberá contar con extintor visible.',
      'Está prohibido: botar aceite o gasolina al suelo, dejar residuos en pits o lavar motocicletas fuera de las zonas autorizadas.',
    ],
  },
  {
    id: 'premiacion',
    title: '15. Premiación',
    bullets: [
      'Todas las categorías tendrán premiación oficial.',
      'Todos los deportistas inscritos recibirán medalla de participación oficial del evento.',
      'La premiación final del campeonato será para los 3 primeros lugares de la tabla general.',
      'La organización podrá otorgar premios especiales como Holeshot.',
    ],
  },
  {
    id: 'protestas',
    title: '16. Protestas',
    bullets: [
      'Toda protesta deberá realizarse de manera respetuosa y por escrito.',
      'La organización será la encargada de analizar y resolver cualquier situación deportiva o técnica.',
      'No se aceptarán protestas ofensivas o irrespetuosas.',
      'Toda protesta deberá realizarse en un tiempo no mayor a 30 minutos finalizada la manga.',
    ],
  },
  {
    id: 'responsabilidad',
    title: '17. Responsabilidad',
    bullets: [
      'Todo piloto participa bajo su propia responsabilidad.',
      'Los padres de familia o acudientes autorizan expresamente la participación del menor en el evento.',
      'La práctica del motocross es considerada una disciplina de alto riesgo.',
      'La organización no será responsable por accidentes, lesiones, daños materiales o pérdidas ocurridas durante el desarrollo del campeonato.',
    ],
  },
  {
    id: 'interpretacion',
    title: '18. Interpretación del reglamento',
    bullets: [
      'La interpretación del presente reglamento será responsabilidad exclusiva del Jurado y Director de Carrera.',
      'Toda situación no contemplada será resuelta conforme al criterio técnico y deportivo de la organización.',
      'El presente reglamento podrá ser actualizado o modificado por la organización cuando sea necesario para mejorar el desarrollo deportivo y la seguridad del campeonato.',
    ],
  },
  {
    id: 'organizador',
    title: '19. Organizador y propietario del evento',
    paragraphs: ['Organizador: Cogua Moto Park.'],
  },
];
