// =========================================================================
        // 1. ESTRUTURA TEMPORAL MULTIDIMENSIONAL (DIAS x HORÁRIOS)
        // =========================================================================
        const DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
        const HORARIOS = [
            { label: '1º Horário', hora: '07:30 - 08:20' },
            { label: '2º Horário', hora: '08:20 - 09:10' },
            { label: '3º Horário', hora: '09:10 - 10:00' },
            { label: '4º Horário', hora: '10:20 - 11:10' },
            { label: '5º Horário', hora: '11:10 - 12:00' }
        ];

        // Matriz 2D [diaIndex][horarioIndex] contendo arrays de alocações simultâneas
        let matrizTemporal = Array.from({ length: DIAS.length }, () =>
            Array.from({ length: HORARIOS.length }, () => [])
        );

        // Cadastros base
        let turmas = ['Turma A (1º Ano)', 'Turma B (2º Ano)', 'Turma C (3º Ano)'];
        let professores = ['Prof. Carlos Silva', 'Profa. Ana Oliveira', 'Prof. Roberto Santos', 'Profa. Maria Fernandes'];
        let disciplinas = ['Matemática', 'Física', 'Química', 'História', 'Geografia', 'Português'];

        // Controle de visualização
        let modoVisao = 'turma'; // 'turma' | 'professor' | 'geral'
        let filtroAtual = turmas[0];
        let ultimaAulaInserida = null;

        // =========================================================================
        // 2. INICIALIZAÇÃO E SINCRONIZAÇÃO DE FORMULÁRIOS
        // =========================================================================
        window.addEventListener('DOMContentLoaded', () => {
            popularSelectsFixos();
            atualizarSelectsDinamicos();
            renderizarTabela();
        });

        function popularSelectsFixos() {
            const selDia = document.getElementById('select-dia');
            const selHorario = document.getElementById('select-horario');

            selDia.innerHTML = DIAS.map((d, idx) => `<option value="${idx}">${d}-feira</option>`).join('');
            selHorario.innerHTML = HORARIOS.map((h, idx) => `<option value="${idx}">${h.label} (${h.hora})</option>`).join('');
        }

        function atualizarSelectsDinamicos() {
            document.getElementById('select-turma').innerHTML =
                turmas.map(t => `<option value="${t}">${t}</option>`).join('');

            document.getElementById('select-professor').innerHTML =
                professores.map(p => `<option value="${p}">${p}</option>`).join('');

            document.getElementById('select-disciplina').innerHTML =
                disciplinas.map(d => `<option value="${d}">${d}</option>`).join('');

            atualizarFiltroVisao();
            renderizarListasEdicao();
        }

        function atualizarFiltroVisao() {
            const selFiltro = document.getElementById('filter-select');
            const lblFiltro = document.getElementById('filter-label');

            if (modoVisao === 'turma') {
                lblFiltro.textContent = 'Turma:';
                selFiltro.disabled = false;
                selFiltro.innerHTML = turmas.map(t => `<option value="${t}">${t}</option>`).join('');
                if (!turmas.includes(filtroAtual)) filtroAtual = turmas[0] || '';
                selFiltro.value = filtroAtual;
            } else if (modoVisao === 'professor') {
                lblFiltro.textContent = 'Professor:';
                selFiltro.disabled = false;
                selFiltro.innerHTML = professores.map(p => `<option value="${p}">${p}</option>`).join('');
                if (!professores.includes(filtroAtual)) filtroAtual = professores[0] || '';
                selFiltro.value = filtroAtual;
            } else {
                lblFiltro.textContent = 'Exibindo:';
                selFiltro.innerHTML = '<option value="TODAS">Todas as Turmas</option>';
                selFiltro.disabled = true;
            }
        }

        // =========================================================================
        // 3. INSERÇÃO NA MATRIZ E VALIDAÇÃO DE CHOQUES
        // =========================================================================
        function registrarAula(event) {
            event.preventDefault();

            const turma = document.getElementById('select-turma').value;
            const professor = document.getElementById('select-professor').value;
            const disciplina = document.getElementById('select-disciplina').value;
            const diaIdx = parseInt(document.getElementById('select-dia').value, 10);
            const horarioIdx = parseInt(document.getElementById('select-horario').value, 10);

            if (!turma || !professor || !disciplina || isNaN(diaIdx) || isNaN(horarioIdx)) return;

            const novaAula = {
                id: Date.now() + Math.random(),
                turma,
                professor,
                disciplina,
                diaIdx,
                horarioIdx
            };

            // Inserção direta na coordenada [dia][horário] da matriz multidimensional
            matrizTemporal[diaIdx][horarioIdx].push(novaAula);
            ultimaAulaInserida = novaAula;

            // Se estiver no modo "Por Turma", muda automaticamente o filtro para a turma onde a aula foi inserida
            if (modoVisao === 'turma' && filtroAtual !== turma) {
                filtroAtual = turma;
                atualizarFiltroVisao();
            }

            // Analisa conflitos naquela célula específica
            const conflitosCelula = verificarConflitosNaCelula(diaIdx, horarioIdx);
            const gerouConflito = conflitosCelula.some(c => c.aulas.some(a => a.id === novaAula.id));

            renderizarTabela();

            if (gerouConflito) {
                abrirModalConflito(novaAula, conflitosCelula);
            }
        }

        function verificarConflitosNaCelula(diaIdx, horarioIdx) {
            const aulasNoSlot = matrizTemporal[diaIdx][horarioIdx];
            const conflitos = [];

            if (aulasNoSlot.length <= 1) return conflitos;

            // Regra 1: Mesmo Professor alocado em duas turmas simultaneamente
            const porProfessor = {};
            aulasNoSlot.forEach(aula => {
                if (!porProfessor[aula.professor]) porProfessor[aula.professor] = [];
                porProfessor[aula.professor].push(aula);
            });

            Object.entries(porProfessor).forEach(([prof, lista]) => {
                if (lista.length > 1) {
                    conflitos.push({
                        tipo: 'PROFESSOR',
                        motivo: `O professor <strong>${prof}</strong> está alocado simultaneamente em: ${lista.map(a => a.turma).join(' e ')}.`,
                        aulas: lista
                    });
                }
            });

            // Regra 2: Mesma Turma com duas aulas no mesmo horário
            const porTurma = {};
            aulasNoSlot.forEach(aula => {
                if (!porTurma[aula.turma]) porTurma[aula.turma] = [];
                porTurma[aula.turma].push(aula);
            });

            Object.entries(porTurma).forEach(([turma, lista]) => {
                if (lista.length > 1) {
                    conflitos.push({
                        tipo: 'TURMA',
                        motivo: `A <strong>${turma}</strong> possui duas aulas simultâneas (${lista.map(a => a.disciplina).join(' e ')}).`,
                        aulas: lista
                    });
                }
            });

            return conflitos;
        }

        // =========================================================================
        // 4. RENDERIZAÇÃO DA TABELA HTML EM TEMPO REAL
        // =========================================================================
        function renderizarTabela() {
            const tbody = document.getElementById('tabela-corpo');
            tbody.innerHTML = '';

            let totalAulas = 0;
            let todosConflitos = [];

            // Itera sobre as linhas (Horários)
            HORARIOS.forEach((horario, hIdx) => {
                const tr = document.createElement('tr');

                // Coluna fixa do horário
                const tdHora = document.createElement('td');
                tdHora.className = 'time-col';
                tdHora.innerHTML = `
                    <div class="time-label">${horario.label}</div>
                    <div class="time-sub">${horario.hora}</div>
                `;
                tr.appendChild(tdHora);

                // Itera sobre as colunas (Dias da Semana)
                DIAS.forEach((dia, dIdx) => {
                    const td = document.createElement('td');
                    const aulasCelula = matrizTemporal[dIdx][hIdx];
                    totalAulas += aulasCelula.length;

                    const conflitosCelula = verificarConflitosNaCelula(dIdx, hIdx);
                    if (conflitosCelula.length > 0) {
                        todosConflitos.push(...conflitosCelula);
                    }

                    // Filtra o que será exibido visualmente nesta célula de acordo com a aba escolhida
                    let aulasVisiveis = aulasCelula;
                    if (modoVisao === 'turma') {
                        aulasVisiveis = aulasCelula.filter(a => a.turma === filtroAtual);
                    } else if (modoVisao === 'professor') {
                        aulasVisiveis = aulasCelula.filter(a => a.professor === filtroAtual);
                    }

                    // Verifica se alguma das aulas visíveis está envolvida em conflito
                    const idsConflitantes = new Set(
                        conflitosCelula.flatMap(c => c.aulas.map(a => a.id))
                    );
                    const celulaTemConflitoVisivel = aulasVisiveis.some(a => idsConflitantes.has(a.id));

                    if (celulaTemConflitoVisivel) {
                        td.classList.add('cell-conflict');
                    }

                    if (aulasVisiveis.length === 0) {
                        td.innerHTML = `<div class="empty-slot" onclick="preencherRapido(${dIdx}, ${hIdx})">+ Livre</div>`;
                    } else {
                        td.innerHTML = aulasVisiveis.map(aula => {
                            const emConflito = idsConflitantes.has(aula.id);
                            return `
                                <div class="lesson-card ${emConflito ? 'conflict' : ''}">
                                    <button class="remove-lesson" title="Remover aula" onclick="removerAula(${dIdx}, ${hIdx}, ${aula.id})">×</button>
                                    ${emConflito ? '<span class="conflict-tag">Inválido</span>' : ''}
                                    <div class="lesson-subject">${aula.disciplina}</div>
                                    <div class="lesson-detail">👨‍🏫 ${aula.professor}</div>
                                    <div class="lesson-detail">🎓 ${aula.turma}</div>
                                </div>
                            `;
                        }).join('');
                    }

                    tr.appendChild(td);
                });

                tbody.appendChild(tr);
            });

            atualizarEstatisticas(totalAulas, todosConflitos);
        }

        function atualizarEstatisticas(totalAulas, conflitos) {
            document.getElementById('stat-total').textContent = totalAulas;
            document.getElementById('stat-profs').textContent = professores.length;
            document.getElementById('stat-turmas').textContent = turmas.length;

            const statConf = document.getElementById('stat-conflicts');
            const cardConf = document.getElementById('card-conflicts');
            const banner = document.getElementById('conflict-banner');

            statConf.textContent = conflitos.length;

            if (conflitos.length > 0) {
                statConf.style.color = '#ef4444';
                cardConf.className = 'stat-card danger';
                banner.classList.add('active');
                document.getElementById('banner-desc').innerHTML = conflitos[0].motivo;
            } else {
                statConf.style.color = '#10b981';
                cardConf.className = 'stat-card green';
                banner.classList.remove('active');
            }
        }

        // =========================================================================
        // 5. INTERAÇÕES, MODAIS E EDIÇÃO DO CALENDÁRIO
        // =========================================================================
        function removerAula(diaIdx, horarioIdx, id) {
            matrizTemporal[diaIdx][horarioIdx] = matrizTemporal[diaIdx][horarioIdx].filter(a => a.id !== id);
            renderizarTabela();
        }

        function desfazerUltimaAula() {
            if (ultimaAulaInserida) {
                removerAula(ultimaAulaInserida.diaIdx, ultimaAulaInserida.horarioIdx, ultimaAulaInserida.id);
                ultimaAulaInserida = null;
            }
            fecharModalConflito();
        }

        function preencherRapido(diaIdx, horarioIdx) {
            document.getElementById('select-dia').value = diaIdx;
            document.getElementById('select-horario').value = horarioIdx;
            if (modoVisao === 'turma' && filtroAtual) {
                document.getElementById('select-turma').value = filtroAtual;
            } else if (modoVisao === 'professor' && filtroAtual) {
                document.getElementById('select-professor').value = filtroAtual;
            }
            document.getElementById('select-disciplina').focus();
        }

        function mudarModoVisao(novoModo) {
            modoVisao = novoModo;
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            document.getElementById(`tab-${novoModo}`).classList.add('active');
            atualizarFiltroVisao();
            renderizarTabela();
        }

        function atualizarFiltro(valor) {
            filtroAtual = valor;
            renderizarTabela();
        }

        function focarPrimeiroConflito() {
            let celula = document.querySelector('.cell-conflict');
            if (!celula) {
                mudarModoVisao('geral');
                celula = document.querySelector('.cell-conflict');
            }
            if (celula) {
                celula.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }

        function abrirModalConflito(aula, conflitos) {
            const listaMotivos = conflitos
                .filter(c => c.aulas.some(a => a.id === aula.id))
                .map(c => `<p style="margin-top:12px; padding:14px; background:rgba(239,68,68,0.2); border-radius:8px; border:1px solid rgba(239,68,68,0.5);">${c.motivo}</p>`)
                .join('');

            document.getElementById('modal-conflito-texto').innerHTML = `
                <p>Tentativa de alocar <strong>${aula.disciplina}</strong> na <strong>${aula.turma}</strong> (${DIAS[aula.diaIdx]} - ${HORARIOS[aula.horarioIdx].label}):</p>
                ${listaMotivos}
            `;
            document.getElementById('modal-conflito').classList.add('open');
        }

        function fecharModalConflito() {
            document.getElementById('modal-conflito').classList.remove('open');
        }

        function abrirModalEditar() {
            renderizarListasEdicao();
            document.getElementById('modal-editar').classList.add('open');
        }

        function fecharModalEditar() {
            document.getElementById('modal-editar').classList.remove('open');
        }

        function renderizarListasEdicao() {
            document.getElementById('lista-profs').innerHTML = professores.map((p, i) =>
                `<li><span>${p}</span><button onclick="removerCadastro('professor', ${i})">×</button></li>`
            ).join('');

            document.getElementById('lista-turmas').innerHTML = turmas.map((t, i) =>
                `<li><span>${t}</span><button onclick="removerCadastro('turma', ${i})">×</button></li>`
            ).join('');

            document.getElementById('lista-discs').innerHTML = disciplinas.map((d, i) =>
                `<li><span>${d}</span><button onclick="removerCadastro('disciplina', ${i})">×</button></li>`
            ).join('');
        }

        function adicionarItem(tipo) {
            if (tipo === 'professor') {
                const inp = document.getElementById('novo-prof');
                if (inp.value.trim()) { professores.push(inp.value.trim()); inp.value = ''; }
            } else if (tipo === 'turma') {
                const inp = document.getElementById('novo-turma');
                if (inp.value.trim()) { turmas.push(inp.value.trim()); inp.value = ''; }
            } else if (tipo === 'disciplina') {
                const inp = document.getElementById('novo-disc');
                if (inp.value.trim()) { disciplinas.push(inp.value.trim()); inp.value = ''; }
            }
            atualizarSelectsDinamicos();
            renderizarTabela();
        }

        function removerCadastro(tipo, index) {
            if (tipo === 'professor' && professores.length > 1) professores.splice(index, 1);
            if (tipo === 'turma' && turmas.length > 1) turmas.splice(index, 1);
            if (tipo === 'disciplina' && disciplinas.length > 1) disciplinas.splice(index, 1);
            atualizarSelectsDinamicos();
            renderizarTabela();
        }

        function limparTudo() {
            matrizTemporal = Array.from({ length: DIAS.length }, () =>
                Array.from({ length: HORARIOS.length }, () => [])
            );
            ultimaAulaInserida = null;
            renderizarTabela();
            fecharModalEditar();
        }
