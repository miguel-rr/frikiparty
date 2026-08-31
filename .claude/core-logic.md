# Frikiparty - Modelo de datos y lógica de negocio

> Fuente de verdad del modelo **antes** de tocar el schema de Drizzle.

## 1. Glosario

Términos del dominio, para que no haya ambigüedad de nombres al hablar de esto.

- **Anillos**: victorias en el torneo principal a lo largo de todas las ediciones. Es el trofeo que se entrega y el término que se utiliza para indicar los campeonatos que ha ganado un jugador (ej. "Richard tiene 8 anillos" significa que Richard ha ganado el torneo principal en 8 ediciones distintas).
- **Anillos individuales**: el mismo concepto que los anillos pero cuando hablamos de torneo individual.
- **Edición**: la convocatoria anual del evento (ej. "Edición 2024"). Puede incluir el torneo de Age of the Ring y otros juegos de mesa.
- **Torneo**: una competición dentro de una edición. El principal es el torneo al videojuego Age of the Ring por equipos. Normalmente consta de fase de grupos + playoffs. Puede haber más de un torneo en una edición. En los últimos años, se está celebrando también un torneo individual al mismo juego.
- **Equipo**: Jugadores agrupados para competir en un torneo concreto (no persiste entre ediciones).
- **Jugador**: una persona física que participa en una o más ediciones a lo largo de los años, con ranking histórico.
- **Usuario**: usuario de la web, ya sea registrado o anónimo. Puede estar o no asociado a un Jugador.
- **Fase**: una etapa del torneo (ej. "Fase de grupos", "Cuartos de final", "Final").
- **Partido**: un enfrentamiento entre dos equipos dentro de una fase. Puede ser a partido único o al mejor de 3, 5, etc.
- **Partida**: cada una de las partidas que forman un partido.
- **Facciones**: se trata de la raza o el bando con el que juega cada uno de los jugadores una partida (ej. "Rohan", "Isengard", "Mordor").
- _(añade aquí cualquier término propio del juego o del grupo: bandos, facciones, formato de puntuación, apodos internos, etc. — cualquier palabra que uses y yo pueda no conocer)_

## 2. Modelo de negocio

### Torneos

- En una edición puede haber más de un torneo. Siempre habrá como mínimo un torneo de Age of the Ring por equipos, pero puede haber más y estos torneos pueden ser de otro juego o videojuego y funcionar con otro formato.
- Un torneo puede ser oficial o no. Sólo será oficial si es de Age of the Ring (o en años previos, de Battle of Middle Earth II).
  - Si es oficial, se podrá elegir entre Age of the Ring o Battle of Middle Earth. Y se deberá indicar la versión exacta del juego que se utilizó para el torneo.
  - Si no es oficial, se deberá elegir el juego de una desplegable de una lista persistente que irá creciendo. Si el juego no aparece en la lista, se podrá añadir y pasará a formar parte de esta lista a partir de ese momento.
- El torneo debe tener un modelo de competición a elegir entre "clásico" (classic) y "suizo" (swiss)
  - Si es clásico, se debe definir:
    - De cuántas fases consta. Como mínimo tendrá una fase.
    - Cada fase podrá ser de tipo grupo (group) o eliminatoria (bracket).
      - Para fase de tipo grupo, se debe establecer:
        - Número de rondas: cuántos partidos juega cada equipo contra cada uno de los otros equipos. Las opciones son "partido único" o "ida y vuelta"
        - Partidas necesarias para ganar el partido: 1 (el que gana la partida, gana el partido), 2 (el mejor de tres), 3 (el mejor de cinco), etc.
        - Modelo de desempate: se debe decidir con antelación la manera en la que se desharía un supuesto empate entre dos o más equipos al final de la fase. Siempre es necesario tener todas las posiciones fijadas. Para ello, se podrá elegir entre las siguientes opciones:
          - Por ranking inverso. Se calcularía el ranking medio del equipo teniendo en cuenta el ranking de cada participante y el orden de los equipos sería de mayor a menor (el peor equipo ranking quedará por encima del mejor equipo por ranking en caso de empate)
          - Por anillos inverso. Similar al previo, pero en lugar de ranking medio se haría con la suma de anillos entre los participantes.
  - Si es suizo, se debe definir:
    - Número de derrotas para ser eliminado. Esto significa que cuando un jugador alcance este número de derrotas, estará eliminado.
    - Criterio de emparejamiento para jugadores con el mismo marcador (también aplicado en la primera ronda). Pudiendo ser:
      - Totalmente aleatorio
      - Ranking por paridad (buscando emparejar jugadores con posiciones similares en el ranking)
      - Ranking por cabezas de serie (buscando emparejar siempre a los mejores contra los peores)
- En el momento de creación de un torneo, se debe guardar un "snapshot" del ranking tal y como estaba en ese momento, para saber cómo era el ranking al inicio del torneo. Este "snapshot" sólo debe contener la info de los participantes del torneo, no de todos los históricos.
  - Si el ranking fuese utilizado para la composición de equipos, también se guardaría un "snapshot" de dicho ranking, que podría ser distinto al histórico por diferencia en el criterio de desempate.
- Tras la creación de un torneo, lo primero siempre deberá ser la composición de los equipos. Una vez cerrados los equipos, el sistema preparará la primera fase y la mostrará.

### Ranking histórico

- El ranking ordena a los jugadores por un criterio: número de anillos en su posesión.
- En caso de empate a anillos, se usan los anillos individuales para desempatar.
- Si el empate persiste, los jugadores comparten puesto (no existe el dato de "ediciones jugadas" y no se utilizará nunca en el proyecto; para dar un orden estable en listados se usa el nombre alfabéticamente).

### Equipos y su configuración

- Los equipos sólo existen para un determinado torneo. Los nombres se suelen elegir y no tienen mayor importancia. Lo importante son los jugadores que lo forman.
- Un jugador no puede estar en dos equipos del mismo torneo.
- No todos los equipos tienen por qué tener el mismo número de jugadores. Es lo normal, pero a veces simplemente somos impares o no es posible cuadrarlo.
- La composición de los equipos siempre es el paso previo al torneo. Es uno de los puntos clave de la web. Los formatos contemplados son:
  - Aleatorio total: se establece el número de equipos y el sistema reparte a los jugadores de forma totalmente aleatoria.
  - Con bombos: se establecen el ranking de jugadores para ese torneo y se forna los bombos, quedando en el primer bombo los considerados "cabezas de serie".
    - Existen varias formas de generar el ranking de jugadores para el torneo:
      - Utilizar el ranking histórico. En esta opción, los jugadores del torneo irían en el mismo orden en el que aparecen en el ranking
      - Generar un ranking por votación: cada jugador participante en el torneo debe ordenar al resto de participantes (a todos menos a él mismo) de mejor a peor según su criterio. El sistema pone en común todas las votaciones y elabora el ranking resultante
      - Combinado. Se realiza la votación como en la opción anterior pero se genera un ranking combinando el histórico y el resultante de las votaciones. Se puede especificar el peso en porcentaje que tiene cada uno de los rankings para modificar el resultado final.
    - NOTA: se elija la forma que se elija, el ranking siempre podrá ser modificado a mano antes de darlo como definitivo.
    - Una vez configurado el ranking se generan los bombos, repartiendo a los jugadores por el orden establecido. Si los equipos son de un máximo de 4 jugadores, habrá el mismo número de bombos. Si el número total de jugadores no es divisible por el número de bombos, el último bombo quedará con menos jugadores.
    - NOTA: los bombos también han de poder modificarse a mano antes de darlos por definitivos.
    - Una vez listos los bombos, existen tres opciones:
      - Generar equipos de forma aleatoria usando los bombos. Es decir, formar equipos con un integrante de cada bombo pero de forma totalmente aleatoria dentro de cada bombo.
      - Realizar un draft, de la siguiente forma:
        - Lo primero es establecer de qué bombo saldrán los "capitanes", que serán los que elijan al resto de componentes del equipo. Por defecto siempre serán los del primer bombo (cabezas de serie), pero se debería poder cambiar si se quiere.
        - Lo siguiente será establecer el modo de draft. Existen dos opciones:
          - Clásico: los capitanes irán escogiendo un jugador de cada bombo de acuerdo al orden que se decida.
            - Para este modo lo siguiente sería establecer el orden en el que eligen los capitanes. Existen varias formas:
              - Por ranking (en el orden que determine el ranking)
              - Por ranking inverso (en el orden inverso al que determine el ranking). Opción por defecto.
              - Aleatorio fijo (se sortea un orden y se sigue ese mismo orden todas las rondas)
              - Aleatorio total (se sortea un orden nuevo en cada ronda de elección)
            - NOTA: el orden de elección ha de poder modificarse a mano antes de darlo por definitivo.
            - Una vez establecido el orden, se establece el método de elección, pudiendo ser:
              - Serpiente (las rondas pares siguen el orden inverso a las impares, de forma que el último en elegir en la primera ronda sería el primero en elegir en la segunda ronda). La primera ronda seguiría el orden establecido y la segunda el inverso. Y así sucesivamente.
              - Lineal (el orden establecido se seguirá en todas las rondas)
            - NOTA: el capitán en su turno puede elegir de cualquier bombo. Obviamente sólo podrá escoger un jugador por bombo, pero en el orden que considere. Cada capitán puede seguir un orden distinto.
          - Subasta: no existe un orden sino que los jugadores se van subastando y los capitanes van pujando hasta llevarse cada uno un jugador de cada bombo.
            - Los jugadores tendrán un precio mínimo dependiendo de su bombo. Los del peor bombo, 50. Los del siguiente 100. Y así sucesivamente. Cada capitán tendrá un presupuesto que será el doble de la suma del precio de todos los bombos. Es decir, si hay dos bombos de los que elegir (50 y 100) el presupuesto será 300. Si hay tres bombos de los que elegir (50, 100 y 150) el presupuesto será 600.
            - La subasta se realizará bombo a bombo.
            - La subasta comenzará por el bombo más alto (excluyendo el de los capitanes, claro). Dentro de cada bombo, los jugadores serán subastados por orden aleatorio.
            - Con cada jugador, cualquier capitán podrá realizar la puja inicial por su valor mínimo.
            - A partir de la puja inicial, cada capitán podrá aumentar la puja subiendo 1, 5 ó 10 el valor.
            - Cuando se recibe una nueva puja, loa controles quedan desactivados durante un segundo o dos hasta que se actualiza el nuevo valor del jugador subastado y se vuelven a activar las opciones para seguir pujando, para evitar pujas involuntarias.
            - La visualización de la subasta siempre muestra el bombo que se está subastando, el jugador que se está subastando y el valor actual por el que el jugador sería "comprado". La identidad del capitán que posee en cada momento la puja más alta no se conoce.
              - También será visible en todo momento el dinero que le queda a cada uno de los capitanes. Y junto a esa información irán apareciendo los jugadores que cada uno de ellos vaya "comprando", para ir viendo en directo cómo van quedando los equipos.
              - NOTA: la visualización será igual para todos excepto para los capitanes, que tendrán las acciones para pujar.
            - Tras cada puja, una vez activadas de nuevo las opciones para seguir pujando, se dará un tiempo de 10 segundos. Si pasan los 10 segundos sin pujas, el jugador irá para el equipo del capitán que hubiese realizado la última puja. En este momento, se actualizará el dinero restante del capitán y se añadirá al jugador a su equipo en la zona destinada para ello. Y finalmente se esperará confirmación para pujar por el siguiente jugador.
              - En la siguiente puja, el capitán que ya tiene en su equipo un jugador de ese bombo no podrá pujar.
              - Una vez quede un único jugador por subastar en el bombo, será asignado automáticamente al único capitán que no haya "comprado" aún ningún jugador de ese bombo y se le descontará del presupuesto el precio mínimo del jugador en cuestión.
            - Si un jugador no recibe ninguna puja (ni siquiera la inicial), se pasa al siguiente jugador del bombo hasta que sea el último jugador del bombo y se pueda asignar automáticamente.
            - Si un capitán no tiene dinero para pujar ni siquiera el mínimo, no podrá pujar durante ese bombo. Si se da el caso con más de un capitán, los capitanes en esta situación podrán pujar por los jugadores restantes (los que no compren los capitanes que sí tengan dinero) sin puja mínima una vez sólo queden ellos por "comprar" jugadores.

