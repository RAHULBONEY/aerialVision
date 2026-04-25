const ragService = require('../services/rag.service');
const { db } = require('../config/firebase');
const admin = require('firebase-admin');

exports.chat = async (req, res) => {
  try {
    const { question, conversationHistory } = req.body;

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '"question" field is required and must be a non-empty string'
      });
    }

    const questionEmbedding = await ragService.getEmbedding(question.trim());

    let contextDocs = [];

    try {
      const [incidentsResult, routesResult] = await Promise.allSettled([
        db
          .collection('incidents')
          .findNearest('embedding', admin.firestore.FieldValue.vector(questionEmbedding), {
            limit: 10,
            distanceMeasure: 'COSINE'
          })
          .get(),
        db
          .collection('routeSessions')
          .findNearest('embedding', admin.firestore.FieldValue.vector(questionEmbedding), {
            limit: 5,
            distanceMeasure: 'COSINE'
          })
          .get()
      ]);

      const incidentDocs = [];
      if (incidentsResult.status === 'fulfilled') {
        const rawIncidents = incidentsResult.value.docs
          .map(doc => {
            const data = doc.data();
            const ts = data.timestamp?.toDate?.() || data.createdAt?.toDate?.() || null;
            return {
              id: doc.id,
              type: 'INCIDENT',
              ragContent: data.ragContent || null,
              timestamp: ts
            };
          })
          .filter(doc => doc.ragContent !== null);

        rawIncidents.sort((a, b) => {
          if (!a.timestamp) return 1;
          if (!b.timestamp) return -1;
          return b.timestamp - a.timestamp;
        });

        incidentDocs.push(...rawIncidents.slice(0, 3));
      } else {
        console.warn('Incidents vector search failed:', incidentsResult.reason?.message);
      }

      const routeDocs = [];
      if (routesResult.status === 'fulfilled') {
        const rawRoutes = routesResult.value.docs
          .map(doc => {
            const data = doc.data();
            const ts = data.timestamp?.toDate?.() || data.createdAt?.toDate?.() || null;
            return {
              id: doc.id,
              type: 'ROUTING_SESSION',
              ragContent: data.ragContent || null,
              timestamp: ts
            };
          })
          .filter(doc => doc.ragContent !== null);

        rawRoutes.sort((a, b) => {
          if (!a.timestamp) return 1;
          if (!b.timestamp) return -1;
          return b.timestamp - a.timestamp;
        });

        routeDocs.push(...rawRoutes.slice(0, 2));
      } else {
        console.warn('RouteSessions vector search failed:', routesResult.reason?.message);
      }

      contextDocs = [...incidentDocs, ...routeDocs];
    } catch (vectorErr) {
      console.warn('Vector search failed (index may not exist yet):', vectorErr.message);
    }

    const answer = await ragService.generateCopilotResponse(question.trim(), contextDocs, conversationHistory || []);

    const sources = contextDocs.map(doc => ({
      id: doc.id,
      type: doc.type,
      preview: doc.ragContent.substring(0, 120) + '...'
    }));

    return res.status(200).json({
      success: true,
      answer,
      sources,
      contextCount: contextDocs.length
    });
  } catch (err) {
    console.error('Copilot chat error:', err.message);
    return res.status(500).json({
      success: false,
      message: err.message || 'Failed to generate copilot response'
    });
  }
};
